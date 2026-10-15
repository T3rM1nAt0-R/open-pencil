import { describe, expect, test } from 'bun:test'

import type { Vector } from '@open-pencil/scene-graph'
import type { PolygonOutlineCommand } from '@open-pencil/scene-graph/polygon'
import {
  SHAPE_WITH_TEXT_TYPES,
  isShapeWithTextType,
  shapeWithTextGeometry,
  shapeWithTextLabelBox
} from '@open-pencil/scene-graph/shape-with-text'

function points(commands: PolygonOutlineCommand[]): Vector[] {
  return commands.flatMap((command) => {
    if (command.type === 'Z') return []
    if (command.type === 'C') {
      return [
        { x: command.x1, y: command.y1 },
        { x: command.x2, y: command.y2 },
        { x: command.x, y: command.y }
      ]
    }
    return [{ x: command.x, y: command.y }]
  })
}

describe('shape-with-text geometry', () => {
  test('FigJam has 30 kinds, named as in .fig files and the plugin API', () => {
    expect(SHAPE_WITH_TEXT_TYPES).toHaveLength(30)
    expect(isShapeWithTextType('ENG_DATABASE')).toBe(true)
    expect(isShapeWithTextType('CLOUD')).toBe(false)
    expect(isShapeWithTextType(undefined)).toBe(false)
  })

  for (const type of SHAPE_WITH_TEXT_TYPES) {
    test(`${type} is one closed outline inside its box`, () => {
      const { outline, details } = shapeWithTextGeometry(type, 200, 100)
      expect(outline[0]?.type).toBe('M')
      expect(outline.at(-1)?.type).toBe('Z')
      expect(outline.filter((command) => command.type === 'M')).toHaveLength(1)
      for (const point of [...points(outline), ...points(details)]) {
        expect(point.x).toBeGreaterThanOrEqual(-1e-9)
        expect(point.x).toBeLessThanOrEqual(200 + 1e-9)
        expect(point.y).toBeGreaterThanOrEqual(-1e-9)
        expect(point.y).toBeLessThanOrEqual(100 + 1e-9)
      }
    })
  }

  for (const type of SHAPE_WITH_TEXT_TYPES) {
    test(`${type} keeps its label inside the box`, () => {
      const box = shapeWithTextLabelBox(type, 200, 100)
      expect(box.width).toBeGreaterThan(0)
      expect(box.height).toBeGreaterThan(0)
      expect(box.x + box.width).toBeLessThanOrEqual(200)
      expect(box.y + box.height).toBeLessThanOrEqual(100)
    })
  }

  test('a diamond reaches the middle of each side and nothing else', () => {
    const { outline } = shapeWithTextGeometry('DIAMOND', 200, 100)
    expect(points(outline)).toEqual([
      { x: 100, y: 0 },
      { x: 200, y: 50 },
      { x: 100, y: 100 },
      { x: 0, y: 50 }
    ])
  })

  test('a database draws its front rim as a stroke-only detail', () => {
    const { details } = shapeWithTextGeometry('ENG_DATABASE', 120, 160)
    expect(details[0]).toEqual({ type: 'M', x: 0, y: 24 })
    expect(details.at(-1)).toMatchObject({ type: 'C', x: 120, y: 24 })
  })

  test('a zero-sized shape gives an empty label box instead of a negative one', () => {
    expect(shapeWithTextLabelBox('SQUARE', 0, 0)).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})
