import {
  TEXT_BINDABLE_FIELDS,
  type SceneGraph,
  type SceneNode,
  type TextBindableField
} from '@open-pencil/scene-graph'

import { assertNodeEditable } from '#core/editor/capabilities'
import {
  raw,
  updateNode,
  type NodeProxyInternals,
  type ProxyThis
} from '#core/figma-api/accessor-utils'
import { rangeBindingChanges } from '#core/figma-api/text/bindings'
import { variableAlias, type FigmaVariableAlias } from '#core/figma-api/text/style'
import { reconcileVariableLayouts } from '#core/layout/variables'

const PAINT_FIELD = /^(fills|strokes)\/(\d+)\/color$/
const CORNER_FIELDS = [
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius'
] as const
const TEXT_FIELDS: ReadonlySet<string> = new Set(TEXT_BINDABLE_FIELDS)

/** The plugin API calls a text node's string binding `characters`; the scene graph calls it `text`. */
function toGraphField(field: string): string {
  return field === 'characters' ? 'text' : field
}
function toPluginField(field: string): string {
  return field === 'text' ? 'characters' : field
}

/**
 * The bindings as Figma's `node.boundVariables` shapes them: one alias per scalar field and an
 * array of aliases, by paint index, for fills and strokes. Bindings to a variable that no longer
 * exists are left out, as the node no longer follows anything. A text node's bindable text fields
 * are arrays too, gathering the node's own binding and those of its character runs.
 */
export function boundVariableAliases(
  node: Pick<SceneNode, 'boundVariables' | 'styleRuns' | 'independentCorners'>,
  exists: (id: string) => boolean
): Record<string, FigmaVariableAlias | FigmaVariableAlias[]> {
  const result: Record<string, FigmaVariableAlias | FigmaVariableAlias[]> = {}
  const textIds = new Map<string, Set<string>>()
  const addText = (field: string, id: string) => {
    if (!exists(id)) return
    const ids = textIds.get(field) ?? new Set<string>()
    textIds.set(field, ids.add(id))
  }
  for (const run of node.styleRuns) {
    for (const [field, id] of Object.entries(run.style.boundVariables ?? {})) addText(field, id)
  }
  for (const [rawField, id] of Object.entries(node.boundVariables)) {
    const field = toPluginField(rawField)
    if (TEXT_FIELDS.has(field)) {
      addText(field, id)
      continue
    }
    if (!exists(id)) continue
    if (field === 'cornerRadius' && node.independentCorners) {
      // Independent corners each follow the variable unless one is bound on its own.
      for (const corner of CORNER_FIELDS) {
        if (!(corner in node.boundVariables)) result[corner] = variableAlias(id)
      }
      continue
    }
    const paint = PAINT_FIELD.exec(field)
    if (!paint) {
      result[field] = variableAlias(id)
      continue
    }
    const [, kind, index] = paint
    const list = Array.isArray(result[kind]) ? result[kind] : []
    list[Number(index)] = variableAlias(id)
    result[kind] = list
  }
  for (const [field, ids] of textIds) result[field] = [...ids].map(variableAlias)
  return result
}

/**
 * Independent corners follow a shared `cornerRadius` binding. Changing one corner's binding first
 * hands that binding to each corner on its own, so the other three keep following it.
 */
function splitSharedCornerBinding(
  sceneGraph: SceneGraph,
  node: Pick<SceneNode, 'id' | 'boundVariables' | 'independentCorners'>,
  field: string
): void {
  const shared = node.boundVariables.cornerRadius
  if (!shared || !node.independentCorners) return
  if (!CORNER_FIELDS.some((corner) => corner === field)) return
  for (const corner of CORNER_FIELDS) {
    if (!(corner in node.boundVariables)) sceneGraph.bindVariable(node.id, corner, shared)
  }
  sceneGraph.unbindVariable(node.id, 'cornerRadius')
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
      get(this: ProxyThis): Readonly<Record<string, FigmaVariableAlias | FigmaVariableAlias[]>> {
        const sceneGraph = graph(this, internals)
        const aliases = boundVariableAliases(raw(this, internals), (id) =>
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
        if (variable !== null && typeof variable.id !== 'string') {
          throw new TypeError('in setBoundVariable: expected a variable or null')
        }
        splitSharedCornerBinding(sceneGraph, node, field)
        if (variable === null) sceneGraph.unbindVariable(node.id, toGraphField(field))
        else sceneGraph.bindVariable(node.id, toGraphField(field), variable.id)
        // A text field bound on the node replaces what its character runs held for that field.
        if (node.type === 'TEXT' && TEXT_FIELDS.has(field) && node.text.length > 0) {
          const { styleRuns } = rangeBindingChanges(
            sceneGraph,
            node,
            0,
            node.text.length,
            field as TextBindableField,
            variable
          )
          updateNode(this, internals, { styleRuns })
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
