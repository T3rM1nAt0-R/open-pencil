import type { AppMenuEntry, AppMenuGroupSchema, AppMenuNeed } from '@/app/shell/menu/schema'

/** What the active tab offers menu items to act on. */
export interface AppMenuContext {
  hasDocument: boolean
  hasSelection: boolean
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
    const need = entry.needs ?? inherited
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
