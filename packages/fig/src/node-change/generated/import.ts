import { pick } from 'es-toolkit'

import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import {
  buildShapeWithTextLabel,
  buildStickySublayers,
  SHAPE_WITH_TEXT_LABEL_LAYOUT,
  shapeWithTextFrameFields,
  STICKY_SUBLAYER_LAYOUT,
  stickyFrameFields,
  stickyScale
} from '@open-pencil/scene-graph'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { cloneRecord } from '../clone'
import { nodeChangeToProps } from '../convert'
import { convertFills } from '../paint'
import {
  derivedFrameEntriesOf,
  generationOverridesOf,
  SHAPE_WITH_TEXT_SLOTS,
  STICKY_SLOTS
} from './records'
import type { GeneratedEntry } from './records'

/** A sublayer as a whole TEXT record: what the user set, placed and shaped as Figma derived it. */
function sublayerRecord(entry: GeneratedEntry | undefined, derived: GeneratedEntry | undefined) {
  const { guidPath: _set, ...fields } = cloneRecord(entry ?? {})
  const record: NodeChange = { ...fields, type: 'TEXT' }
  if (derived?.size) record.size = cloneRecord(derived.size)
  if (derived?.transform) record.transform = cloneRecord(derived.transform)
  if (derived?.derivedTextData) record.derivedTextData = cloneRecord(derived.derivedTextData)
  return record
}

function sublayerProps(
  entry: GeneratedEntry | undefined,
  derived: GeneratedEntry | undefined,
  blobs: Uint8Array[],
  layout: Partial<SceneNode> = STICKY_SUBLAYER_LAYOUT
): Partial<SceneNode> {
  const {
    nodeType: _type,
    name: _name,
    ...props
  } = nodeChangeToProps(sublayerRecord(entry, derived), blobs, 'occurrence')
  return { ...props, ...layout }
}

/**
 * Gives an imported STICKY the sublayers its record describes. The note's colour is its
 * background's fill, which the note itself carries here; its layout comes from the template at
 * the scale its author line was set in.
 */
export function materializeStickyContent(
  graph: SceneGraph,
  sticky: SceneNode,
  record: NodeChange,
  blobs: Uint8Array[]
): void {
  const overrides = generationOverridesOf(record)
  const derived = derivedFrameEntriesOf(record)
  const { background, body, author } = STICKY_SLOTS
  const bodyProps = sublayerProps(overrides.get(body), derived.get(body), blobs)
  const authorProps = sublayerProps(overrides.get(author), derived.get(author), blobs)
  const scale = overrides.has(author) ? stickyScale({ fontSize: authorProps.fontSize ?? 0 }) : 1
  graph.updateNode(sticky.id, {
    fills: convertFills(overrides.get(background)?.fillPaints),
    ...stickyFrameFields(scale)
  })
  buildStickySublayers(graph, sticky, { scale }, { body: bodyProps, author: authorProps })
}

/** A shape with text's own paint, corners and effects, which FigJam keeps on its background. */
function backgroundProps(
  entry: GeneratedEntry | undefined,
  blobs: Uint8Array[]
): Partial<SceneNode> {
  if (!entry) return {}
  const { guidPath: _slot, ...fields } = cloneRecord(entry)
  const props = nodeChangeToProps({ ...fields, type: 'RECTANGLE' }, blobs, 'occurrence')
  return pick(props, [
    'fills',
    'strokes',
    'strokeCap',
    'strokeJoin',
    'dashPattern',
    'cornerRadius',
    'effects'
  ])
}

/**
 * Gives an imported SHAPE_WITH_TEXT the label its record describes, centred in the label box of
 * its kind. A shape without a generated label gets an empty one, which typing fills.
 */
export function materializeShapeWithTextContent(
  graph: SceneGraph,
  shape: SceneNode,
  record: NodeChange,
  blobs: Uint8Array[]
): void {
  const { background, label } = SHAPE_WITH_TEXT_SLOTS
  const overrides = generationOverridesOf(record)
  const entry = overrides.get(label)
  const derived = derivedFrameEntriesOf(record).get(label)
  graph.updateNode(shape.id, {
    ...backgroundProps(overrides.get(background), blobs),
    shapeUserWidth: shape.width,
    shapeUserHeight: shape.shapeUserHeight > 0 ? shape.shapeUserHeight : shape.height,
    ...shapeWithTextFrameFields(shape.shapeWithTextType, shape.width, shape.height)
  })
  const props = entry ? sublayerProps(entry, derived, blobs, SHAPE_WITH_TEXT_LABEL_LAYOUT) : {}
  buildShapeWithTextLabel(graph, shape, props)
}
