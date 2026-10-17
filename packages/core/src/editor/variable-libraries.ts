import { isLibraryCollection } from '@open-pencil/scene-graph'

import type { EditorContext } from './types'

export function createLibraryCollectionActions(ctx: EditorContext) {
  /**
   * Makes a library's copy the file's own: the collection and its variables lose the library
   * keys, so Figma lists them with the file's and shows the variables and modes added here.
   * Bindings and aliases point at variable IDs, so they keep resolving as before.
   */
  function makeCollectionLocal(collectionId: string) {
    const collection = ctx.graph.variableCollections.get(collectionId)
    if (!collection || !isLibraryCollection(collection)) return
    const keys = new Map<string, { key?: string; version?: string }>()
    for (const id of collection.variableIds) {
      const variable = ctx.graph.variables.get(id)
      if (variable) keys.set(id, { key: variable.key, version: variable.version })
    }
    const previous = { key: collection.key, version: collection.version }
    const apply = (local: boolean) => {
      const target = ctx.graph.variableCollections.get(collectionId)
      if (!target) return
      target.key = local ? undefined : previous.key
      target.version = local ? undefined : previous.version
      for (const [id, saved] of keys) {
        const variable = ctx.graph.variables.get(id)
        if (!variable) continue
        variable.key = local ? undefined : saved.key
        variable.version = local ? undefined : saved.version
      }
      ctx.requestRefresh()
    }
    apply(true)
    ctx.undo.push({
      label: 'Make collection local',
      forward: () => apply(true),
      inverse: () => apply(false)
    })
  }

  return { makeCollectionLocal }
}
