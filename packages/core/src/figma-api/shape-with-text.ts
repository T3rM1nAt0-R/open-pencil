import { createShapeWithText, type SceneGraph, type SceneNode } from '@open-pencil/scene-graph'
import {
  isShapeWithTextType,
  type ShapeWithTextType
} from '@open-pencil/scene-graph/shape-with-text'

import type { InterfaceTheme } from '#core/constants'
import { newLayerDefaults } from '#core/editor/shapes/defaults'

/** A shape with text's FigJam kind; other layers have none. */
export function shapeTypeOf(node: SceneNode): ShapeWithTextType | undefined {
  return node.type === 'SHAPE_WITH_TEXT' ? node.shapeWithTextType : undefined
}

/** `value` as a kind for `node`, refused as Figma refuses it. */
export function checkedShapeType(node: SceneNode, value: unknown): ShapeWithTextType {
  if (node.type !== 'SHAPE_WITH_TEXT') {
    throw new Error('in set_shapeType: Only a shape with text has a shape type')
  }
  if (!isShapeWithTextType(value)) {
    throw new Error(`in set_shapeType: Invalid shape type "${String(value)}"`)
  }
  return value
}

/** A new, empty shape with text on `pageId`, a square until its kind changes. */
export function newShapeWithText(
  graph: SceneGraph,
  pageId: string,
  theme: InterfaceTheme
): SceneNode {
  return createShapeWithText(graph, pageId, newLayerDefaults('SHAPE_WITH_TEXT', theme))
}
