import { pick } from 'es-toolkit'

import { shapeWithTextLabel, stickySublayers } from '@open-pencil/scene-graph'
import type { SceneNode } from '@open-pencil/scene-graph'

import { generatedSlotPath, SHAPE_WITH_TEXT_SLOTS, STICKY_SLOTS } from '../generated/records'
import type { GeneratedEntry } from '../generated/records'
import { createFillPaints } from './context'
import type { KiwiNodeChange, SceneNodeToKiwiContext } from './context'
import { serializeText } from './text'

/**
 * The fields a STICKY's own record keeps, as Figma writes it. Its colour, text and layout live in
 * its sublayers' entries, so the fields the note carries here as an auto layout frame stay out.
 */
const STICKY_RECORD_FIELDS = [
  'guid',
  'parentIndex',
  'phase',
  'type',
  'name',
  'visible',
  'opacity',
  'blendMode',
  'locked',
  'size',
  'transform',
  'effects',
  'autoRename',
  'frameMaskDisabled',
  'exportSettings',
  'pluginData',
  'pluginRelaunchData'
] as const

/**
 * The fields a SHAPE_WITH_TEXT's own record keeps, as FigJam writes it: those of a sticky but its
 * effects. Its paint, corners and effects live on its background, its text on its label.
 */
const SHAPE_WITH_TEXT_RECORD_FIELDS = STICKY_RECORD_FIELDS.filter((field) => field !== 'effects')

/** What a shape with text's background keeps: the shape's own paint, corners and effects. */
const SHAPE_WITH_TEXT_BACKGROUND_FIELDS = [
  'fillPaints',
  'strokePaints',
  'strokeWeight',
  'strokeAlign',
  'strokeCap',
  'strokeJoin',
  'dashPattern',
  'cornerRadius',
  'effects'
] as const

function placement(node: SceneNode): Pick<GeneratedEntry, 'size' | 'transform'> {
  return {
    size: { x: node.width, y: node.height },
    transform: { m00: 1, m01: 0, m02: node.x, m10: 0, m11: 1, m12: node.y }
  }
}

/** A text sublayer's entry, and its placement and glyphs as Figma would derive them. */
function textSublayer(
  context: SceneNodeToKiwiContext,
  slot: number,
  node: SceneNode
): { entry: GeneratedEntry; derived: GeneratedEntry } {
  const fields: KiwiNodeChange = {}
  serializeText(context, node, fields)
  const { derivedTextData, ...text } = fields
  const entry: GeneratedEntry = {
    ...text,
    guidPath: generatedSlotPath(slot),
    visible: node.visible,
    fillPaints: createFillPaints(context, node)
  }
  const derived: GeneratedEntry = { guidPath: generatedSlotPath(slot), ...placement(node) }
  if (derivedTextData) derived.derivedTextData = derivedTextData
  return { entry, derived }
}

/** Whether a sublayer's derived text can stand in for Figma's: shaped, unless it has no text. */
function shaped(node: SceneNode, derived: GeneratedEntry): boolean {
  return node.text === '' || (derived.derivedTextData?.glyphs?.length ?? 0) > 0
}

/**
 * Whether a layer is written as a generated frame: a note whose sublayers are the template's.
 * One that lost them is written as a plain frame with its children, so nothing it shows is lost.
 */
export function writesGeneratedFrame(context: SceneNodeToKiwiContext, node: SceneNode): boolean {
  if (node.type === 'SHAPE_WITH_TEXT') return shapeWithTextLabel(context.graph, node) !== null
  return node.type === 'STICKY' && stickySublayers(context.graph, node) !== null
}

/**
 * A shape with text's record as FigJam writes it: its kind on it, its paint on its generated
 * background and its text on its generated label.
 */
function shapeWithTextRecord(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): KiwiNodeChange | null {
  const label = shapeWithTextLabel(context.graph, node)
  if (!label) return null
  const record: KiwiNodeChange = pick(nc, SHAPE_WITH_TEXT_RECORD_FIELDS)
  record.shapeWithTextType = node.shapeWithTextType
  if (node.shapeUserHeight > 0) record.shapeUserHeight = node.shapeUserHeight
  const { background: backgroundSlot, label: labelSlot } = SHAPE_WITH_TEXT_SLOTS
  const background: GeneratedEntry = {
    guidPath: generatedSlotPath(backgroundSlot),
    ...pick(nc, SHAPE_WITH_TEXT_BACKGROUND_FIELDS),
    cornerRadius: node.cornerRadius
  }
  const text = textSublayer(context, labelSlot, label)
  record.nodeGenerationData = {
    overrides: [background, text.entry],
    useFineGrainedSyncing: false,
    diffOnlyRemovals: []
  }
  if (shaped(label, text.derived)) {
    const backgroundPlacement: GeneratedEntry = {
      guidPath: generatedSlotPath(backgroundSlot),
      ...placement({ ...node, x: 0, y: 0 })
    }
    record.derivedImmutableFrameData = {
      overrides: [backgroundPlacement, text.derived],
      version: 1
    }
  }
  return record
}

/**
 * A generated frame's record, with its sublayers written on it as Figma stores a sticky note: what
 * each sublayer shows under `nodeGenerationData`, and the layout derived from it under
 * `derivedImmutableFrameData`. Figma draws a note from its derived data as saved and lays it out
 * afresh only without it, so the export writes that data only when it has shaped every text.
 */
export function generatedFrameRecord(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): KiwiNodeChange | null {
  if (node.type === 'SHAPE_WITH_TEXT') return shapeWithTextRecord(context, node, nc)
  const sublayers = node.type === 'STICKY' ? stickySublayers(context.graph, node) : null
  if (!sublayers) return null
  const record: KiwiNodeChange = pick(nc, STICKY_RECORD_FIELDS)
  const fillPaints = createFillPaints(context, node)
  const background: GeneratedEntry = {
    guidPath: generatedSlotPath(STICKY_SLOTS.background),
    fillPaints,
    cornerRadius: 0
  }
  const overrides: GeneratedEntry[] = [background]
  const derived: GeneratedEntry[] = [
    { guidPath: generatedSlotPath(STICKY_SLOTS.background), ...placement({ ...node, x: 0, y: 0 }) }
  ]
  let complete = true
  for (const [slot, layer] of [
    [STICKY_SLOTS.body, sublayers.body],
    [STICKY_SLOTS.author, sublayers.author]
  ] as const) {
    const text = textSublayer(context, slot, layer)
    overrides.push(text.entry)
    derived.push(text.derived)
    complete &&= shaped(layer, text.derived)
  }
  record.nodeGenerationData = { overrides, useFineGrainedSyncing: false, diffOnlyRemovals: [] }
  if (complete) record.derivedImmutableFrameData = { overrides: derived, version: 1 }
  return record
}
