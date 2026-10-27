import { ref } from 'vue'

export type SettingsSection =
  | 'general'
  | 'toolbar'
  | 'ai'
  | 'usage'
  | 'diagnostics'
  | 'privacy'
  | 'mcp'
  | 'tools'
  | 'fonts'
  | 'media'
  | 'storage'
  | 'cloud'

export const settingsDialogOpen = ref(false)
export const settingsDialogSection = ref<SettingsSection>('general')
/** The section Settings shows on the Home tab, apart from the one in the window. */
export const homeSettingsSection = ref<SettingsSection>('general')

type SettingsNavigationRequest = (action: () => void, options?: { closesWindow?: boolean }) => void
let requestNavigation: SettingsNavigationRequest | null = null

export function registerSettingsNavigation(request: SettingsNavigationRequest) {
  requestNavigation = request
  return () => {
    if (requestNavigation === request) requestNavigation = null
  }
}

/** Runs an action once the Settings window, if it is open, agrees to close: unsaved edits ask first. */
export function afterSettingsDialogCloses(action: () => void): void {
  if (!settingsDialogOpen.value || !requestNavigation) {
    action()
    return
  }
  requestNavigation(
    () => {
      settingsDialogOpen.value = false
      action()
    },
    { closesWindow: true }
  )
}

export function openSettingsDialog(section?: SettingsSection): void {
  if (settingsDialogOpen.value && (!section || section === settingsDialogSection.value)) return
  const open = () => {
    if (section) settingsDialogSection.value = section
    settingsDialogOpen.value = true
  }
  if (settingsDialogOpen.value && requestNavigation) requestNavigation(open)
  else open()
}
