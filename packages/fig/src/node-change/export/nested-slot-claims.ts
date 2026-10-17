import { isEqual, isPlainObject } from 'es-toolkit'

import {
  getInstanceOverride,
  scaleNodeChanges,
  slotPropertyId,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/scene-graph'

import { getOrCreatePropertyGuid, type SceneNodeToKiwiContext } from './context'
import { slotContentAssignment } from './slots'

/** Fields that identify a layer or link it to its source rather than describe how it looks. */
const IDENTITY_FIELDS = new Set([
  'id',
  'parentId',
  'childIds',
  'source',
  'componentId',
  'overrideKey',
  'instanceOverrides'
])

/**
 * Whether two field values match, where numbers that differ only by the rounding of a rescale
 * are the same and a field a rescale left undefined is the same as one that is missing.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number')
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, index) => sameValue(item, b[index]))
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every((key) => sameValue(a[key], b[key]))
  }
  return isEqual(a, b)
}

/**
 * A layer as it looks at the source's scale. A copy rescaled with its instance holds every
 * layer scaled, which is not an edit of the slot.
 */
function atSourceScale(node: SceneNode, ratio: number): SceneNode {
  if (ratio === 1) return node
  return {
    ...node,
    ...scaleNodeChanges(node, 1 / ratio, true),
    componentScale: node.componentScale / ratio
  }
}

function sameLayer(graph: SceneGraph, layer: SceneNode, source: SceneNode, ratio: number): boolean {
  const a = atSourceScale(layer, ratio)
  const keys = new Set([...Object.keys(a), ...Object.keys(source)] as Array<keyof SceneNode>)
  for (const key of keys) {
    if (!IDENTITY_FIELDS.has(key) && !sameValue(a[key], source[key])) return false
  }
  const aChildren = graph.getChildren(layer.id)
  const bChildren = graph.getChildren(source.id)
  return (
    aChildren.length === bChildren.length &&
    aChildren.every((child, index) => sameLayer(graph, child, bChildren[index], ratio))
  )
}

/** The slot frames directly in an instance, by slot property, without entering nested ones. */
function slotFrames(graph: SceneGraph, instance: SceneNode): Map<string, SceneNode> {
  const frames = new Map<string, SceneNode>()
  const visit = (node: SceneNode): void => {
    for (const child of graph.getChildren(node.id)) {
      const propertyId = slotPropertyId(child)
      if (propertyId) frames.set(propertyId, child)
      else if (child.type !== 'INSTANCE') visit(child)
    }
  }
  visit(instance)
  return frames
}

/** Whether a nested instance's slot holds something other than what the instance it copies shows. */
function slotDiffersFromSource(
  graph: SceneGraph,
  owner: SceneNode,
  nested: SceneNode,
  frame: SceneNode,
  propertyId: string
): boolean {
  // A swap replaces the nested instance's component and keeps the one it copied in the owner.
  const linked = getInstanceOverride(
    owner.instanceOverrides,
    owner.id,
    nested.id,
    'sourceComponentId'
  )
  const sourceId = typeof linked === 'string' ? linked : nested.componentId
  const source = sourceId ? graph.getNode(sourceId) : undefined
  const counterpart =
    source?.type === 'INSTANCE' ? slotFrames(graph, source).get(propertyId) : undefined
  return (
    !counterpart ||
    !sameLayer(graph, frame, counterpart, frame.componentScale / counterpart.componentScale)
  )
}

/**
 * A copy of a component that holds an instance keeps that instance's slot content as its own
 * layers. Figma stores a copy's edits to them as slot content assigned to the nested instance,
 * through an override at its path; a copy that left the slot as it was stays without one.
 */
export function nestedSlotAssignments(
  context: SceneNodeToKiwiContext,
  owner: SceneNode,
  nested: SceneNode,
  localIdCounter: { value: number }
) {
  const assignments: NonNullable<ReturnType<typeof slotContentAssignment>>[] = []
  const frames = slotFrames(context.graph, nested)
  for (const propertyId of Object.keys(nested.componentPropertyAssignments)) {
    const frame = frames.get(propertyId)
    if (context.componentPropertyDefinitionsById.get(propertyId)?.type !== 'SLOT' || !frame)
      continue
    if (!slotDiffersFromSource(context.graph, owner, nested, frame, propertyId)) continue
    const assignment = slotContentAssignment(
      context,
      nested,
      propertyId,
      getOrCreatePropertyGuid(context, propertyId, localIdCounter),
      localIdCounter
    )
    if (assignment) assignments.push(assignment)
  }
  return assignments
}
