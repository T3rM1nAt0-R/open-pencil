import type { SceneGraph } from '@open-pencil/scene-graph'

import { assertNodeEditable } from '#core/editor/capabilities'
import { raw, type NodeProxyInternals, type ProxyThis } from '#core/figma-api/accessor-utils'
import { reconcileVariableLayouts } from '#core/layout/variables'

/** What Figma's plugin API returns for a binding. */
export interface VariableAlias {
  type: 'VARIABLE_ALIAS'
  id: string
}

const PAINT_FIELD = /^(fills|strokes)\/(\d+)\/color$/

function alias(id: string): VariableAlias {
  return { type: 'VARIABLE_ALIAS', id }
}

/**
 * The bindings as Figma's `node.boundVariables` shapes them: one alias per scalar field and an
 * array of aliases, by paint index, for fills and strokes. Bindings to a variable that no longer
 * exists are left out, as the node no longer follows anything.
 */
export function boundVariableAliases(
  bindings: Readonly<Record<string, string>>,
  exists: (id: string) => boolean
): Record<string, VariableAlias | VariableAlias[]> {
  const result: Record<string, VariableAlias | VariableAlias[]> = {}
  for (const [field, id] of Object.entries(bindings)) {
    if (!exists(id)) continue
    const paint = PAINT_FIELD.exec(field)
    if (!paint) {
      result[field] = alias(id)
      continue
    }
    const [, kind, index] = paint
    const list = Array.isArray(result[kind]) ? result[kind] : []
    list[Number(index)] = alias(id)
    result[kind] = list
  }
  return result
}

function graph(target: ProxyThis, internals: NodeProxyInternals): SceneGraph {
  return target[internals.graph] as SceneGraph
}

export function installVariableModeNodeProxyAccessors(
  prototype: object,
  internals: NodeProxyInternals
): void {
  Object.defineProperties(prototype, {
    boundVariables: {
      get(this: ProxyThis): Readonly<Record<string, VariableAlias | VariableAlias[]>> {
        const sceneGraph = graph(this, internals)
        const aliases = boundVariableAliases(raw(this, internals).boundVariables, (id) =>
          sceneGraph.variables.has(id)
        )
        return Object.freeze(aliases)
      }
    },
    setBoundVariable: {
      value(this: ProxyThis, field: string, variable: { id: string } | null): void {
        const sceneGraph = graph(this, internals)
        const node = raw(this, internals)
        assertNodeEditable(sceneGraph, node.id)
        if (PAINT_FIELD.test(field) || field === 'fills' || field === 'strokes') {
          throw new Error(
            `in setBoundVariable: "${field}" is a paint field. Bind a fill or stroke colour with figma.bindVariable(nodeId, "fills/0/color", variableId).`
          )
        }
        if (variable === null) sceneGraph.unbindVariable(node.id, field)
        else if (typeof variable.id === 'string') {
          sceneGraph.bindVariable(node.id, field, variable.id)
        } else {
          throw new TypeError('in setBoundVariable: expected a variable or null')
        }
        reconcileVariableLayouts(sceneGraph, { subtrees: [node.id] })
      }
    },
    explicitVariableModes: {
      get(this: ProxyThis): Readonly<Record<string, string>> {
        return Object.freeze({ ...raw(this, internals).variableModes })
      }
    },
    resolvedVariableModes: {
      get(this: ProxyThis): Readonly<Record<string, string>> {
        const sceneGraph = graph(this, internals)
        const node = raw(this, internals)
        const modes: Record<string, string> = {}
        for (const collectionId of sceneGraph.variableCollections.keys()) {
          const modeId = sceneGraph.getNodeVariableModeId(node.id, collectionId)
          if (modeId) modes[collectionId] = modeId
        }
        return Object.freeze(modes)
      }
    }
  })
}
