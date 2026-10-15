import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { SceneGraph } from '@open-pencil/scene-graph'

const RED = [{ type: 'SOLID' as const, color: { r: 1, g: 0, b: 0 } }]

function api() {
  return new FigmaAPI(new SceneGraph())
}

function colour(paints: unknown): number[] | undefined {
  if (!Array.isArray(paints)) return undefined
  const [paint] = paints as { color?: { r: number; g: number; b: number } }[]
  return paint?.color ? [paint.color.r, paint.color.g, paint.color.b] : undefined
}

describe('shapes with text in the plugin API', () => {
  test('a new shape with text is a 208 px square with an empty, centred label', () => {
    const shape = api().createShapeWithText()
    expect(shape.type).toBe('SHAPE_WITH_TEXT')
    expect(shape.shapeType).toBe('SQUARE')
    expect([shape.width, shape.height]).toEqual([208, 208])
    expect(shape.text?.characters).toBe('')
    expect(shape.text?.textAlignHorizontal).toBe('CENTER')
  })

  test('the shape type changes the kind and refuses names FigJam does not have', () => {
    const shape = api().createShapeWithText()
    shape.shapeType = 'ENG_DATABASE'
    expect(shape.shapeType).toBe('ENG_DATABASE')
    expect(() => {
      shape.shapeType = 'CLOUD' as never
    }).toThrow('Invalid shape type "CLOUD"')
  })

  test('the label is the shape\'s own text, and its fills colour the words, not the shape', () => {
    const shape = api().createShapeWithText()
    const before = colour(shape.fills)
    const label = shape.text
    if (!label) throw new Error('no label')
    label.characters = 'Check stock'
    label.fills = RED
    expect(shape.characters).toBe('Check stock')
    expect(colour(label.fills)).toEqual([1, 0, 0])
    expect(colour(shape.fills)).toEqual(before)
  })

  test('label edits pass through to the shape', () => {
    const shape = api().createShapeWithText()
    const label = shape.text
    if (!label) throw new Error('no label')
    label.characters = 'stock'
    label.insertCharacters(0, 'Check ')
    label.fontSize = 20
    expect(shape.characters).toBe('Check stock')
    expect(shape.fontSize).toBe(20)
  })

  test('other layers have no shape type and no label', () => {
    const rectangle = api().createRectangle()
    expect(rectangle.shapeType).toBeUndefined()
    expect(rectangle.text).toBeUndefined()
    expect(() => {
      rectangle.shapeType = 'SQUARE'
    }).toThrow('Only a shape with text has a shape type')
  })
})
