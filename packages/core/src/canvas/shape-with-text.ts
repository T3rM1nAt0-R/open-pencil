import type { Canvas } from 'canvaskit-wasm'

import type { Fill, SceneNode } from '@open-pencil/scene-graph'
import { shapeWithTextLabelBox } from '@open-pencil/scene-graph/shape-with-text'

import type { SkiaRenderer } from './renderer'

/** FigJam writes a shape's label in black unless its characters say otherwise. */
const LABEL_FILL: Fill = {
  type: 'SOLID',
  color: { r: 0, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true
}

const labels = new WeakMap<SceneNode, SceneNode>()

/**
 * A shape with text's label as a text layer in its label box. Nodes are replaced when they
 * change, so the label is reused for as long as its shape is the same object.
 */
export function shapeWithTextLabel(node: SceneNode): SceneNode {
  const known = labels.get(node)
  if (known) return known
  const box = shapeWithTextLabelBox(node.shapeWithTextType, node.width, node.height)
  const label: SceneNode = {
    ...node,
    id: `${node.id}:label`,
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
  labels.set(node, label)
  return label
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
