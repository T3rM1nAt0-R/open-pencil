pub mod events;

use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use tauri::menu::{
    CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, MenuItemKind, Submenu, SubmenuBuilder,
};

#[cfg(any(target_os = "macos", target_os = "windows"))]
use tauri::menu::PredefinedMenuItem;

#[derive(Deserialize)]
struct MenuGroup {
    label: String,
    items: Vec<MenuEntry>,
}

#[derive(Deserialize)]
struct MenuEntry {
    #[serde(default)]
    r#type: Option<String>,
    id: Option<String>,
    label: Option<String>,
    accelerator: Option<String>,
    #[serde(default)]
    checkbox: bool,
    /// A feature the frontend turns on before the item shows (`set_native_menu_features`).
    feature: Option<String>,
    #[serde(default)]
    sub: Vec<MenuEntry>,
}

/// What the schema menu is built from besides the schema: recent files and enabled features.
#[derive(Default)]
pub struct NativeMenuInputs {
    pub recent_files: Vec<String>,
    pub features: Vec<String>,
    /// Items that cannot act yet, such as Save with no document open (`set_native_menu_disabled`).
    pub disabled: Vec<String>,
}

impl NativeMenuInputs {
    fn enabled(&self, id: Option<&str>) -> bool {
        id.is_none_or(|id| !self.disabled.iter().any(|disabled| disabled == id))
    }
}

pub struct NativeMenuState(pub Mutex<NativeMenuInputs>);

/// What one build reads: the inputs, and the check states the menu being replaced had.
struct MenuBuild<'a> {
    inputs: &'a NativeMenuInputs,
    checked: HashMap<String, bool>,
}

#[cfg(target_os = "macos")]
#[derive(Deserialize)]
struct AppMenuItem {
    label: String,
    accelerator: Option<String>,
}

/// Generated from `APP_MENU_APP_ITEMS`; placement stays here because the
/// OS-predefined items sit between these entries.
#[cfg(target_os = "macos")]
#[derive(Deserialize)]
struct AppMenuFile {
    about: AppMenuItem,
    #[serde(rename = "check-updates")]
    check_updates: AppMenuItem,
    settings: AppMenuItem,
    quit: AppMenuItem,
}

#[cfg(target_os = "macos")]
fn app_menu_file() -> tauri::Result<AppMenuFile> {
    Ok(serde_json::from_str(include_str!(
        "../../generated/app-menu.json"
    ))?)
}

/// The macOS application menu holds Settings…, so the schema's copy is left out there, along
/// with a separator it would leave at the end of its menu.
fn platform_entries<'a>(items: &'a [MenuEntry], features: &[String]) -> Vec<&'a MenuEntry> {
    let mut entries: Vec<&MenuEntry> = items
        .iter()
        .filter(|entry| !(cfg!(target_os = "macos") && entry.id.as_deref() == Some("settings")))
        .filter(|entry| {
            entry
                .feature
                .as_ref()
                .is_none_or(|feature| features.contains(feature))
        })
        .collect();
    while entries
        .last()
        .is_some_and(|entry| entry.r#type.as_deref() == Some("separator"))
    {
        entries.pop();
    }
    entries
}

fn build_submenu<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    id: Option<&str>,
    label: &str,
    items: &[MenuEntry],
    build: &MenuBuild,
) -> tauri::Result<Submenu<R>> {
    let mut builder = match id {
        Some(id) => SubmenuBuilder::with_id(app, id, label),
        None => SubmenuBuilder::new(app, label),
    }
    .enabled(build.inputs.enabled(id));

    for entry in platform_entries(items, &build.inputs.features) {
        if entry.r#type.as_deref() == Some("separator") {
            builder = builder.separator();
            continue;
        }

        let label = entry.label.as_deref().unwrap_or_default();
        if entry.id.as_deref() == Some("open-recent") {
            let submenu = build_recent_files_submenu(app, label, &build.inputs.recent_files)?;
            builder = builder.item(&submenu);
            continue;
        }
        if !entry.sub.is_empty() {
            let submenu = build_submenu(app, entry.id.as_deref(), label, &entry.sub, build)?;
            builder = builder.item(&submenu);
            continue;
        }

        // Ordinary menu accelerators emit a frontend command without preserving the
        // WebView's focused editing control. Native edit items let WebKit/WebView2
        // route copy, cut, and paste to inputs or dispatch canvas clipboard events.
        // Keep Linux on the frontend path: muda's native edit items require optional
        // X11 automation and are explicitly unsupported on Wayland.
        #[cfg(any(target_os = "macos", target_os = "windows"))]
        if let Some(id) = entry.id.as_deref() {
            let native_edit_item = match id {
                "copy" => Some(PredefinedMenuItem::copy(app, Some(label))?),
                "cut" => Some(PredefinedMenuItem::cut(app, Some(label))?),
                "paste" => Some(PredefinedMenuItem::paste(app, Some(label))?),
                _ => None,
            };
            if let Some(item) = native_edit_item {
                builder = builder.item(&item);
                continue;
            }
        }

        if entry.checkbox {
            // A rebuild keeps what the menu it replaces had checked.
            let checked = entry
                .id
                .as_ref()
                .and_then(|id| build.checked.get(id).copied())
                .unwrap_or(true);
            let mut item = CheckMenuItemBuilder::new(label)
                .checked(checked)
                .enabled(build.inputs.enabled(entry.id.as_deref()));
            if let Some(id) = &entry.id {
                item = item.id(id);
            }
            if let Some(accelerator) = &entry.accelerator {
                item = item.accelerator(accelerator);
            }
            builder = builder.item(&item.build(app)?);
            continue;
        }

        let mut item =
            MenuItemBuilder::new(label).enabled(build.inputs.enabled(entry.id.as_deref()));
        if let Some(id) = &entry.id {
            item = item.id(id);
        }
        // On Linux, muda's predefined edit commands depend on optional X11
        // automation and do not work on Wayland. Leave these accelerators to the
        // WebView instead, which preserves native input and canvas paste events.
        let webview_handles_accelerator = cfg!(target_os = "linux")
            && matches!(entry.id.as_deref(), Some("copy" | "cut" | "paste"));
        if !webview_handles_accelerator {
            if let Some(accelerator) = &entry.accelerator {
                item = item.accelerator(accelerator);
            }
        }
        builder = builder.item(&item.build(app)?);
    }

    builder.build()
}

fn recent_file_label(path: &str) -> String {
    let path = Path::new(path);
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .map(str::to_owned)
        .unwrap_or_else(|| path.as_os_str().to_string_lossy().into_owned());
    let parent = path
        .parent()
        .and_then(Path::file_name)
        .and_then(|name| name.to_str());
    parent.map_or(name.clone(), |parent| format!("{name} — {parent}"))
}

fn build_recent_files_submenu<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    recent_files: &[String],
) -> tauri::Result<Submenu<R>> {
    let mut builder =
        SubmenuBuilder::with_id(app, "open-recent", label).enabled(!recent_files.is_empty());
    for (index, path) in recent_files.iter().enumerate() {
        let item = MenuItemBuilder::new(recent_file_label(path))
            .id(format!("open-recent:{index}"))
            .build(app)?;
        builder = builder.item(&item);
    }
    if !recent_files.is_empty() {
        builder = builder.separator().item(
            &MenuItemBuilder::new("Clear Menu")
                .id("clear-recent-files")
                .build(app)?,
        );
    }
    builder.build()
}

fn build_schema_menus<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    build: &MenuBuild,
) -> tauri::Result<Vec<Submenu<R>>> {
    let groups: Vec<MenuGroup> = serde_json::from_str(include_str!("../../generated/menu.json"))?;
    groups
        .iter()
        .map(|group| build_submenu(app, None, &group.label, &group.items, build))
        .collect()
}

fn collect_checked<R: tauri::Runtime>(
    items: Vec<MenuItemKind<R>>,
    checked: &mut HashMap<String, bool>,
) {
    for item in items {
        match &item {
            MenuItemKind::Check(check) => {
                if let Ok(state) = check.is_checked() {
                    checked.insert(item.id().0.clone(), state);
                }
            }
            MenuItemKind::Submenu(submenu) => {
                if let Ok(children) = submenu.items() {
                    collect_checked(children, checked);
                }
            }
            _ => {}
        }
    }
}

fn current_checked<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> HashMap<String, bool> {
    let mut checked = HashMap::new();
    if let Some(items) = app.menu().and_then(|menu| menu.items().ok()) {
        collect_checked(items, &mut checked);
    }
    checked
}

fn find_menu_item<R: tauri::Runtime>(
    items: Vec<MenuItemKind<R>>,
    id: &str,
) -> Option<MenuItemKind<R>> {
    for item in items {
        if item.id().0 == id {
            return Some(item);
        }
        if let MenuItemKind::Submenu(submenu) = &item {
            if let Ok(children) = submenu.items() {
                if let Some(found) = find_menu_item(children, id) {
                    return Some(found);
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn native_menu_checked<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    id: String,
) -> Result<bool, String> {
    let menu = app
        .menu()
        .ok_or_else(|| "Application menu is unavailable".to_string())?;
    let item = find_menu_item(menu.items().map_err(|error| error.to_string())?, &id)
        .ok_or_else(|| format!("Menu item not found: {id}"))?;
    match item {
        MenuItemKind::Check(item) => item.is_checked().map_err(|error| error.to_string()),
        _ => Err(format!("Menu item is not checkable: {id}")),
    }
}

#[tauri::command]
pub fn set_native_menu_checked<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    id: String,
    checked: bool,
) -> Result<(), String> {
    let menu = app
        .menu()
        .ok_or_else(|| "Application menu is unavailable".to_string())?;
    let item = find_menu_item(menu.items().map_err(|error| error.to_string())?, &id)
        .ok_or_else(|| format!("Menu item not found: {id}"))?;
    match item {
        MenuItemKind::Check(item) => item.set_checked(checked).map_err(|error| error.to_string()),
        _ => Err(format!("Menu item is not checkable: {id}")),
    }
}

pub fn install_app_menu<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    inputs: &NativeMenuInputs,
) -> tauri::Result<()> {
    let build = MenuBuild {
        inputs,
        checked: current_checked(app),
    };
    #[cfg(target_os = "macos")]
    let app_menu = {
        let items = app_menu_file()?;
        let mut check_updates =
            MenuItemBuilder::new(&items.check_updates.label).id("check-updates");
        if let Some(accelerator) = &items.check_updates.accelerator {
            check_updates = check_updates.accelerator(accelerator);
        }
        let mut settings = MenuItemBuilder::new(&items.settings.label).id("settings");
        if let Some(accelerator) = &items.settings.accelerator {
            settings = settings.accelerator(accelerator);
        }
        let mut quit = MenuItemBuilder::new(&items.quit.label).id("quit");
        if let Some(accelerator) = &items.quit.accelerator {
            quit = quit.accelerator(accelerator);
        }
        SubmenuBuilder::new(app, tauri::Manager::package_info(app).name.clone())
            .item(&PredefinedMenuItem::about(
                app,
                Some(&items.about.label),
                None,
            )?)
            .item(&check_updates.build(app)?)
            .separator()
            .item(&settings.build(app)?)
            .separator()
            .item(&PredefinedMenuItem::services(app, None)?)
            .separator()
            .item(&PredefinedMenuItem::hide(app, None)?)
            .item(&PredefinedMenuItem::hide_others(app, None)?)
            .item(&PredefinedMenuItem::show_all(app, None)?)
            .separator()
            .item(&quit.build(app)?)
            .build()?
    };

    let schema_menus = build_schema_menus(app, &build)?;
    let mut builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    {
        builder = builder.item(&app_menu);
    }

    for menu in &schema_menus {
        builder = builder.item(menu);
    }

    app.set_menu(builder.build()?)?;
    Ok(())
}

/// Rebuilds the menu after one of its inputs changed.
pub fn update_app_menu<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    change: impl FnOnce(&mut NativeMenuInputs),
) -> Result<(), String> {
    let state = tauri::Manager::state::<NativeMenuState>(app);
    let mut inputs = state
        .0
        .lock()
        .map_err(|_| "Menu state is unavailable".to_string())?;
    change(&mut inputs);
    install_app_menu(app, &inputs).map_err(|error| error.to_string())
}

/// Applies the disabled ids to the menu already installed, so a selection change does not
/// rebuild it. The predefined Copy, Cut and Paste items cannot be disabled and stay on.
fn apply_disabled<R: tauri::Runtime>(items: Vec<MenuItemKind<R>>, disabled: &[String]) {
    for item in items {
        let enabled = !disabled.contains(&item.id().0);
        match &item {
            MenuItemKind::MenuItem(item) => {
                let _ = item.set_enabled(enabled);
            }
            MenuItemKind::Check(item) => {
                let _ = item.set_enabled(enabled);
            }
            MenuItemKind::Submenu(submenu) => {
                // The recent files submenu is enabled by whether it has files.
                if submenu.id().0 != "open-recent" {
                    let _ = submenu.set_enabled(enabled);
                }
                if let Ok(children) = submenu.items() {
                    apply_disabled(children, disabled);
                }
            }
            _ => {}
        }
    }
}

/// Greys out the items that need an open document or a selection, and enables the rest.
#[tauri::command]
pub fn set_native_menu_disabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    ids: Vec<String>,
) -> Result<(), String> {
    let state = tauri::Manager::state::<NativeMenuState>(&app);
    let mut inputs = state
        .0
        .lock()
        .map_err(|_| "Menu state is unavailable".to_string())?;
    inputs.disabled = ids;
    if let Some(items) = app.menu().and_then(|menu| menu.items().ok()) {
        apply_disabled(items, &inputs.disabled);
    }
    Ok(())
}

#[tauri::command]
pub fn set_native_menu_features<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    features: Vec<String>,
) -> Result<(), String> {
    update_app_menu(&app, |inputs| inputs.features = features)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_listed_items_are_disabled() {
        let inputs = NativeMenuInputs {
            disabled: vec!["save".into(), "export-png".into()],
            ..Default::default()
        };

        assert!(!inputs.enabled(Some("save")));
        assert!(!inputs.enabled(Some("export-png")));
        assert!(inputs.enabled(Some("open")));
        assert!(inputs.enabled(None));
    }
}
