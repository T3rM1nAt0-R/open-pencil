import { isEqual } from 'es-toolkit'

import {
  getInstanceOverride,
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

function sameLayer(graph: SceneGraph, a: SceneNode, b: SceneNode): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as Array<keyof SceneNode>)
  for (const key of keys) {
    if (!IDENTITY_FIELDS.has(key) && !isEqual(a[key], b[key])) return false
  }
  const aChildren = graph.getChildren(a.id)
  const bChildren = graph.getChildren(b.id)
  return (
    aChildren.length === bChildren.length &&
    aChildren.every((child, index) => sameLayer(graph, child, bChildren[index]))
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
  return !counterpart || !sameLayer(graph, frame, counterpart)
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
