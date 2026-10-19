import { shapeWithTextFrameFields } from '@open-pencil/scene-graph'
import type { ShapeWithTextType } from '@open-pencil/scene-graph/shape-with-text'

import { recordSubtreeEdit } from '#core/editor/components/slots/history'
import type { EditorContext } from '#core/editor/types'

/** Shape-with-text commands: the kind the tool places, and the kind of shapes already placed. */
export function createShapeWithTextActions(ctx: EditorContext) {
  /** Makes `kind` the one the shape tool places, as picking it in FigJam's Shapes panel does. */
  function setShapeWithTextKind(kind: ShapeWithTextType) {
    ctx.state.shapeWithTextKind = kind
  }

  /**
   * Turns the shapes with text among `ids` into `kind`, keeping their size, as FigJam's shape
   * switcher does; each lays its label out in the new kind's label area.
   */
  function changeShapesWithTextKind(ids: Iterable<string>, kind: ShapeWithTextType) {
    const shapes = [...ids].flatMap((id) => {
      const node = ctx.graph.getNode(id)
      return node?.type === 'SHAPE_WITH_TEXT' && node.shapeWithTextType !== kind ? [node] : []
    })
    if (shapes.length === 0) return
    recordSubtreeEdit(
      ctx,
      'Change shape',
      shapes.map((shape) => shape.id),
      () => {
        for (const shape of shapes) {
          ctx.graph.updateNode(shape.id, {
            shapeWithTextType: kind,
            ...shapeWithTextFrameFields(kind, shape.width, shape.height)
          })
        }
      }
    )
  }

  return { setShapeWithTextKind, changeShapesWithTextKind }
}
