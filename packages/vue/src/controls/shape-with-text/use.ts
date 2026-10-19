import { computed } from 'vue'

import type { SceneNode } from '@open-pencil/scene-graph'
import type { ShapeWithTextType } from '@open-pencil/scene-graph/shape-with-text'

import { useEditor } from '#vue/editor/context'
import { useSelectionState } from '#vue/editor/selection-state/use'
import { useSceneComputed } from '#vue/internal/scene-computed/use'

/**
 * Headless state and actions for shapes with text: the kind the shape tool places, and the kind
 * of the selected shapes. A selection of several shapes reads its first shape and changes them all.
 */
export function useShapeWithText() {
  const editor = useEditor()
  const { selectedIds } = useSelectionState()

  const shapes = useSceneComputed(() => {
    const nodes = [...selectedIds.value].map((id) => editor.graph.getNode(id))
    return nodes.length > 0 && nodes.every((node) => node?.type === 'SHAPE_WITH_TEXT')
      ? nodes.filter((node): node is SceneNode => node !== undefined)
      : []
  })
  const active = computed(() => shapes.value.length > 0)
  const kind = computed<ShapeWithTextType | null>(
    () => shapes.value.at(0)?.shapeWithTextType ?? null
  )
  const toolKind = computed(() => editor.state.shapeWithTextKind)
  const toolActive = computed(() => editor.state.activeTool === 'SHAPE_WITH_TEXT')

  /** Turns the selected shapes into `value`, keeping their size. */
  function setKind(value: ShapeWithTextType) {
    editor.changeShapesWithTextKind(
      shapes.value.map((shape) => shape.id),
      value
    )
  }

  /** Picks `value` for the shape tool and arms it, as FigJam's Shapes panel does. */
  function drawKind(value: ShapeWithTextType) {
    editor.setShapeWithTextKind(value)
    editor.setTool('SHAPE_WITH_TEXT')
  }

  return { active, kind, toolKind, toolActive, setKind, drawKind }
}
