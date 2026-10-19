import * as v from 'valibot'

import {
  createShapeWithText,
  SHAPE_WITH_TEXT_CORNER_RADIUS,
  SHAPE_WITH_TEXT_SIZE,
  shapeWithTextLabel,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/scene-graph'

import { enumProp, SHAPE_KIND, STROKE_ALIGN, STROKE_CAP, STROKE_JOIN } from './enums'
import { collectFillProps, collectStrokeProps } from './export/paint'
import type { JSXProp } from './export/value'
import { isFillValue } from './overrides/fills'
import { isStrokeValue } from './overrides/strokes'
import { plainTextOf, type TreeNode } from './tree'
import { ColorProp, PlacedOwnLayerProps, readElementProps } from './validation'

/**
 * `<Shape kind="diamond" bg="#FFC943">Decide</Shape>`: a FigJam shape with text, made from the
 * same template as the shape tool's. Its text is the label.
 */
export const SHAPE_ELEMENT = 'shape'

const Size = v.pipe(v.number(), v.gtValue(0))
const Dash = v.array(v.number())

/**
 * The layer props a shape has: its place, the size it is given, which it grows past to fit its
 * label, and its paint. The label is styled as FigJam styles it, and the shape lays it out.
 */
export const ShapeLayerProps = v.object({
  ...PlacedOwnLayerProps.entries,
  w: v.optional(Size),
  h: v.optional(Size),
  rotate: v.optional(v.number()),
  rounded: v.optional(v.pipe(v.number(), v.minValue(0))),
  bg: v.optional(v.custom(isFillValue, 'expected a colour or a paint')),
  fills: v.optional(v.array(v.custom(isFillValue, 'expected a colour or a paint'))),
  stroke: v.optional(ColorProp),
  strokeWidth: v.optional(Size),
  strokeAlign: v.optional(enumProp(STROKE_ALIGN)),
  strokeDash: v.optional(Dash),
  strokes: v.optional(v.array(v.custom(isStrokeValue, 'expected a stroke'))),
  strokeCap: v.optional(enumProp(STROKE_CAP)),
  strokeJoin: v.optional(enumProp(STROKE_JOIN)),
  dashPattern: v.optional(Dash)
})

/** The props `<Shape>` takes: its kind, and the layer props a shape has. */
export const ShapeProps = v.object({
  kind: v.optional(enumProp(SHAPE_KIND)),
  ...ShapeLayerProps.entries
})

/**
 * The shape an element describes, with `layer`'s fields; it is named by its label, as FigJam
 * names a shape, until given a name.
 */
export function renderShapeNode(
  graph: SceneGraph,
  tree: TreeNode,
  parentId: string,
  layer: Partial<SceneNode>
) {
  const props = readElementProps(ShapeProps, tree.props)
  const text = plainTextOf(tree)
  return createShapeWithText(
    graph,
    parentId,
    {
      ...layer,
      name: layer.name ?? (text.trim() || 'Shape with text'),
      autoRename: !layer.name,
      shapeWithTextType: props.kind ?? 'SQUARE'
    },
    { text }
  )
}

/**
 * A shape's own props as `<Shape>` writes them, after its name and position: the size it was
 * given rather than the size its label grew it to, so it grows the same way when read back.
 */
export function shapeWithTextProps(node: SceneNode): JSXProp[] {
  const props: JSXProp[] = []
  if (node.shapeWithTextType !== 'SQUARE') {
    props.push(['kind', SHAPE_KIND.print(node.shapeWithTextType)])
  }
  const width = node.shapeUserWidth > 0 ? node.shapeUserWidth : node.width
  const height = node.shapeUserHeight > 0 ? node.shapeUserHeight : node.height
  if (width !== SHAPE_WITH_TEXT_SIZE) props.push(['w', width])
  if (height !== SHAPE_WITH_TEXT_SIZE) props.push(['h', height])
  if (node.rotation !== 0) props.push(['rotate', Math.round(node.rotation * 100) / 100])
  collectFillProps(node, props)
  collectStrokeProps(node, props)
  if (node.cornerRadius !== SHAPE_WITH_TEXT_CORNER_RADIUS)
    props.push(['rounded', node.cornerRadius])
  if (node.opacity < 1) props.push(['opacity', Math.round(node.opacity * 100) / 100])
  if (!node.visible) props.push(['visible', false])
  return props
}

/** The label a shape writes as its children. */
export function shapeWithTextLabelText(graph: SceneGraph, node: SceneNode): string {
  return shapeWithTextLabel(graph, node)?.text ?? ''
}
