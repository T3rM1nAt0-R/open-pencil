import type { AppMenuEntry, AppMenuGroupSchema, AppMenuNeed } from '@/app/shell/menu/schema'

/** What the active tab offers menu items to act on. */
export interface AppMenuContext {
  hasDocument: boolean
  hasSelection: boolean
}

/**
 * What each item needs, kept apart from the schema so the menu layout stays readable. An item's
 * own `needs` wins over this table, which wins over the need its group or parent names.
 */
const ITEM_NEEDS: Readonly<Partial<Record<string, AppMenuNeed>>> = {
  save: 'document',
  'save-as': 'document',
  'save-to': 'document',
  'export-selection': 'selection',
  'edit.undo': 'document',
  'edit.redo': 'document',
  copy: 'selection',
  cut: 'selection',
  paste: 'document',
  'paste-to-replace': 'selection',
  'selection.duplicate': 'selection',
  'selection.delete': 'selection',
  'selection.rename': 'selection',
  'selection.selectAll': 'document',
  'selection.selectInverse': 'document',
  'view.zoom100': 'document',
  'view.zoomFit': 'document',
  'view.zoomSelection': 'selection',
  'zoom-in': 'document',
  'zoom-out': 'document',
  'view.zoomPreviousFrame': 'document',
  'view.zoomNextFrame': 'document',
  'view.previousPage': 'document',
  'view.nextPage': 'document',
  'view-split-right': 'document',
  'view-split-down': 'document',
  variables: 'document',
  'view-rulers': 'document',
  'view-pixel-grid': 'document',
  'view-multiplayer-cursors': 'document',
  'view-comments': 'document',
  'toggle-ui': 'document',
  'toggle-preview': 'document',
  'insert-icon': 'document',
  'text.bold': 'selection',
  'text.italic': 'selection',
  'text.underline': 'selection'
}

function needMet(need: AppMenuNeed | undefined, context: AppMenuContext): boolean {
  if (need === 'document') return context.hasDocument
  if (need === 'selection') return context.hasDocument && context.hasSelection
  return true
}

function unmetEntries(
  entries: readonly AppMenuEntry[],
  inherited: AppMenuNeed | undefined,
  context: AppMenuContext
): string[] {
  return entries.flatMap((entry) => {
    if (entry.type === 'separator') return []
    const need = entry.needs ?? ITEM_NEEDS[entry.id] ?? inherited
    return [
      ...(needMet(need, context) ? [] : [entry.id]),
      ...unmetEntries(entry.sub ?? [], need, context)
    ]
  })
}

/** The ids of the items that cannot act yet, for the native menu and the in-app menu alike. */
export function unmetMenuIds(
  schema: readonly AppMenuGroupSchema[],
  context: AppMenuContext
): string[] {
  return schema.flatMap((group) => unmetEntries(group.items, group.needs, context))
}
