import { describe, expect, test } from 'bun:test'

import { shapeWithTextLabel } from '#core/canvas/shape-with-text'
import { SceneGraph } from '@open-pencil/scene-graph'

function emptyShape() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('A new graph has a page')
  const node = graph.createNode('SHAPE_WITH_TEXT', page.id, {
    width: 160,
    height: 110,
    shapeWithTextType: 'SQUARE'
  })
  return { graph, node }
}

describe('shape with text labels', () => {
  test('the label is reused while its shape is unchanged', () => {
    const { node } = emptyShape()
    expect(shapeWithTextLabel(node)).toBe(shapeWithTextLabel(node))
  })

  test('the label follows text, kind and size edited in place', () => {
    const { graph, node } = emptyShape()
    expect(shapeWithTextLabel(node).text).toBe('')

    graph.updateNode(node.id, { text: 'Typed later' })
    expect(shapeWithTextLabel(node).text).toBe('Typed later')

    const square = shapeWithTextLabel(node)
    graph.updateNode(node.id, { shapeWithTextType: 'DIAMOND' })
    const diamond = shapeWithTextLabel(node)
    expect(diamond.width).toBeLessThan(square.width)

    graph.updateNode(node.id, { width: 320 })
    expect(shapeWithTextLabel(node).width).toBeGreaterThan(diamond.width)
  })
})
