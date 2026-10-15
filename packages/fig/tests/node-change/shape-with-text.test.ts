import { describe, expect, test } from 'bun:test'

import { nodeChangeToProps, sceneNodeToKiwi } from '#fig/node-change/index'

import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import { SceneGraph } from '@open-pencil/scene-graph'

const RED = { r: 1, g: 0, b: 0, a: 1 }

function written(graph: SceneGraph, id: string): NodeChange {
  const node = graph.getNode(id)
  if (!node) throw new Error('Expected the node')
  return sceneNodeToKiwi(node, { sessionID: 1, localID: 1 }, 0, { value: 2 }, graph, [])[0]
}

describe('shape with text records', () => {
  test('write the shape kind and the label', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const shape = graph.createNode('SHAPE_WITH_TEXT', page.id, {
      shapeWithTextType: 'ENG_DATABASE',
      text: 'Orders',
      width: 160,
      height: 120
    })
    const nc = written(graph, shape.id)
    expect(nc).toMatchObject({ type: 'SHAPE_WITH_TEXT', shapeWithTextType: 'ENG_DATABASE' })
    expect(nc.textData?.characters).toBe('Orders')
  })

  test('read back the kind and label they wrote', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const shape = graph.createNode('SHAPE_WITH_TEXT', page.id, {
      shapeWithTextType: 'DIAMOND',
      text: 'Paid?',
      width: 120,
      height: 120
    })
    expect(nodeChangeToProps(written(graph, shape.id), [])).toMatchObject({
      nodeType: 'SHAPE_WITH_TEXT',
      shapeWithTextType: 'DIAMOND',
      text: 'Paid?'
    })
  })

  // FigJam keeps a shape's label on the text layer it generates inside the shape, with that
  // layer's fills colouring the words.
  test('read a FigJam label from the generated text layer', () => {
    const props = nodeChangeToProps(
      {
        type: 'SHAPE_WITH_TEXT',
        size: { x: 200, y: 120 },
        shapeWithTextType: 'ELLIPSE',
        nodeGenerationData: {
          overrides: [
            {
              fillPaints: [
                { type: 'SOLID', color: { r: 0.9, g: 0.9, b: 1, a: 1 }, opacity: 1, visible: true }
              ]
            },
            {
              textData: { characters: 'Start' },
              fontSize: 24,
              fillPaints: [{ type: 'SOLID', color: RED, opacity: 1, visible: true }]
            }
          ]
        }
      } as NodeChange,
      []
    )
    expect(props).toMatchObject({
      nodeType: 'SHAPE_WITH_TEXT',
      shapeWithTextType: 'ELLIPSE',
      text: 'Start',
      fontSize: 24
    })
    expect(props.styleRuns).toEqual([
      { start: 0, length: 5, style: { fills: [expect.objectContaining({ color: RED })] } }
    ])
  })

  test('fall back to a square for a kind FigJam does not have', () => {
    const props = nodeChangeToProps(
      {
        type: 'SHAPE_WITH_TEXT',
        size: { x: 10, y: 10 },
        shapeWithTextType: 'CLOUD'
      } as NodeChange,
      []
    )
    expect(props).toMatchObject({ shapeWithTextType: 'SQUARE' })
  })
})
