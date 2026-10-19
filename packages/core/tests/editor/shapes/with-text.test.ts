import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { setTextMeasurer } from '@open-pencil/core'
import { createEditor } from '@open-pencil/core/editor'
import { shapeWithTextLabel } from '@open-pencil/scene-graph'

import { applyGeneratedTextNameEdit } from '#core/editor/text/name'
import { expectDefined } from '#core-tests/helpers/assert'

function setup() {
  const editor = createEditor()
  return { editor, pageId: editor.state.currentPageId }
}

beforeEach(() => {
  setTextMeasurer((node, maxWidth) => ({
    width: maxWidth ?? node.width,
    height: node.text.split('\n').length * (node.lineHeight ?? node.fontSize)
  }))
})
afterEach(() => setTextMeasurer(null))

describe('shapes with text in the editor', () => {
  test('the tool places the kind picked last, painted as FigJam paints a new shape', () => {
    const { editor, pageId } = setup()
    editor.setShapeWithTextKind('DIAMOND')
    const id = editor.createShape('SHAPE_WITH_TEXT', 0, 0, 176, 176, pageId)
    const shape = expectDefined(editor.graph.getNode(id))
    expect(shape.shapeWithTextType).toBe('DIAMOND')
    expect(shape.fills[0]?.color).toEqual({ r: 1, g: 1, b: 1, a: 1 })
    expect(shape.strokes[0]).toMatchObject({ weight: 4, align: 'CENTER' })
    expect(expectDefined(shapeWithTextLabel(editor.graph, shape)).fontSize).toBe(16)
  })

  test('switching the kind keeps the size, and is one undo step', () => {
    const { editor, pageId } = setup()
    const id = editor.createShape('SHAPE_WITH_TEXT', 0, 0, 240, 120, pageId)
    editor.changeShapesWithTextKind([id], 'HEXAGON')
    expect(editor.graph.getNode(id)).toMatchObject({
      shapeWithTextType: 'HEXAGON',
      width: 240,
      height: 120
    })
    editor.undo.undo()
    expect(editor.graph.getNode(id)?.shapeWithTextType).toBe('SQUARE')
  })

  test("typing in a shape's label renames a shape that was never renamed", () => {
    const { editor, pageId } = setup()
    const id = editor.createShape('SHAPE_WITH_TEXT', 0, 0, 176, 176, pageId)
    const shape = expectDefined(editor.graph.getNode(id))
    const label = expectDefined(shapeWithTextLabel(editor.graph, shape))
    applyGeneratedTextNameEdit(editor, label.id, 'Valid?')
    expect(editor.graph.getNode(id)?.name).toBe('Valid?')
    applyGeneratedTextNameEdit(editor, label.id, '')
    expect(editor.graph.getNode(id)?.name).toBe('Shape with text')
  })
})
