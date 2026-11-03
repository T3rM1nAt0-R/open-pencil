import { APP_MENU_SCHEMA, type AppMenuEntry } from '@/app/shell/menu/schema'

function selectionIds(entries: readonly AppMenuEntry[]): string[] {
  return entries.flatMap((entry) => {
    if (entry.type === 'separator') return []
    return [...(entry.needs === 'selection' ? [entry.id] : []), ...selectionIds(entry.sub ?? [])]
  })
}

const SELECTION_MENU_IDS = new Set(APP_MENU_SCHEMA.flatMap((group) => selectionIds(group.items)))

/** The ids of the items that act on a selection and have no editor command to say so. */
export function selectionMenuIds(): ReadonlySet<string> {
  return SELECTION_MENU_IDS
}

export function menuItemNeedsSelection(id: string): boolean {
  return SELECTION_MENU_IDS.has(id)
}

/** The selection items to grey out: all of them while nothing is selected, none after. */
export function selectionMenuIdsDisabled(hasSelection: boolean): string[] {
  return hasSelection ? [] : [...SELECTION_MENU_IDS]
}
