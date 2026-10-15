import type { Canvas } from 'canvaskit-wasm'

import type { Fill, SceneNode } from '@open-pencil/scene-graph'
import { shapeWithTextLabelBox } from '@open-pencil/scene-graph/shape-with-text'

import { BLACK } from '#core/constants'

import type { SkiaRenderer } from './renderer'

/** FigJam writes a shape's label in black unless its characters say otherwise. */
const LABEL_FILL: Fill = {
  type: 'SOLID',
  color: BLACK,
  opacity: 1,
  visible: true
}

interface CachedLabel {
  label: SceneNode
  width: number
  height: number
}

const labels = new WeakMap<SceneNode, CachedLabel>()

/** The fields a label sets for itself rather than copying from its shape. */
const LABEL_OWN_FIELDS = new Set<string>([
  'id',
  'type',
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'textAutoResize',
  'textAlignVertical',
  'fills',
  'strokes',
  'effects',
  'textPicture',
  'derivedTextGlyphs',
  'textPathData',
  'textPathBox'
])

// The scene graph edits nodes in place, so a cached label is reused only while every field
// it copied still holds the shape's current value.
function labelIsCurrent(node: SceneNode, cached: CachedLabel): boolean {
  if (cached.width !== node.width || cached.height !== node.height) return false
  for (const key of Object.keys(node)) {
    if (LABEL_OWN_FIELDS.has(key)) continue
    if (Reflect.get(cached.label, key) !== Reflect.get(node, key)) return false
  }
  return true
}

/**
 * A shape with text's label as a text layer in its label box. The same label object is
 * returned until the shape changes, so text caches keyed by it stay warm between edits.
 */
export function shapeWithTextLabel(node: SceneNode): SceneNode {
  const known = labels.get(node)
  if (known && labelIsCurrent(node, known)) return known.label
  const box = shapeWithTextLabelBox(node.shapeWithTextType, node.width, node.height)
  const label: SceneNode = {
    ...node,
    // The label keeps the shape's id, so its text edits and layout belong to the shape.
    id: node.id,
    type: 'TEXT',
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rotation: 0,
    textAutoResize: 'NONE',
    textAlignVertical: 'CENTER',
    fills: [LABEL_FILL],
    strokes: [],
    effects: [],
    textPicture: null,
    derivedTextGlyphs: null,
    textPathData: null,
    textPathBox: null
  }
  labels.set(node, { label, width: node.width, height: node.height })
  return label
}

/** The layer text is laid out on: a shape with text's label, or a text layer itself. */
export function textLayoutNode(node: SceneNode): SceneNode {
  return node.type === 'SHAPE_WITH_TEXT' ? shapeWithTextLabel(node) : node
}

/** Draws a shape with text's label over its fills and strokes. */
export function renderShapeWithTextLabel(r: SkiaRenderer, canvas: Canvas, node: SceneNode): void {
  if (node.type !== 'SHAPE_WITH_TEXT' || !node.text) return
  const label = shapeWithTextLabel(node)
  canvas.save()
  canvas.translate(label.x, label.y)
  r.fillPaint.setShader(null)
  r.fillPaint.setColor(r.ck.Color4f(0, 0, 0, 1))
  r.renderText(canvas, label, LABEL_FILL)
  canvas.restore()
}
