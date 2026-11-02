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

/** Item ids by what the menu does with them: `hidden` ones are left out, `disabled` ones greyed. */
export interface AppMenuItemStates {
  hidden: string[]
  disabled: string[]
}

function collectStates(
  entries: readonly AppMenuEntry[],
  inherited: AppMenuNeed | undefined,
  context: AppMenuContext,
  states: AppMenuItemStates
): void {
  for (const entry of entries) {
    if (entry.type === 'separator') continue
    const need = entry.needs ?? ITEM_NEEDS[entry.id] ?? inherited
    if (!needMet(need, context)) {
      // Without a document nothing can act, so the item goes; with one, a missing selection only
      // greys it, so the menus do not jump about as the selection changes.
      ;(context.hasDocument ? states.disabled : states.hidden).push(entry.id)
    }
    collectStates(entry.sub ?? [], need, context, states)
  }
}

/** Which items the native menu and the in-app menu leave out or grey out for this context. */
export function menuItemStates(
  schema: readonly AppMenuGroupSchema[],
  context: AppMenuContext
): AppMenuItemStates {
  const states: AppMenuItemStates = { hidden: [], disabled: [] }
  for (const group of schema) collectStates(group.items, group.needs, context, states)
  return states
}
