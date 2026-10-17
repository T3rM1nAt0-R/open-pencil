import { expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { SceneGraph } from '@open-pencil/scene-graph'

const solid = {
  type: 'SOLID' as const,
  color: { r: 0, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true
}

function setup() {
  const figma = new FigmaAPI(new SceneGraph())
  const collection = figma.createVariableCollection('Sizes')
  const size = figma.createVariable('size', 'FLOAT', collection.id, 120)
  const color = figma.createVariable('brand', 'COLOR', collection.id, { r: 1, g: 0, b: 0, a: 1 })
  const frame = figma.createFrame()
  return { figma, frame, size, color }
}

test('boundVariables is empty for an unbound node', () => {
  const { frame } = setup()
  expect(frame.boundVariables).toEqual({})
})

test('setBoundVariable binds a field and boundVariables reports an alias', () => {
  const { frame, size } = setup()
  frame.setBoundVariable('width', size)
  expect(frame.boundVariables.width).toEqual({ type: 'VARIABLE_ALIAS', id: size.id })
})

test('setBoundVariable with null removes the binding', () => {
  const { frame, size } = setup()
  frame.setBoundVariable('width', size)
  frame.setBoundVariable('width', null)
  expect(frame.boundVariables.width).toBeUndefined()
})

test('paint colour bindings are grouped under fills as an array', () => {
  const { figma, frame, color } = setup()
  frame.fills = [solid]
  figma.bindVariable(frame.id, 'fills/0/color', color.id)
  expect(frame.boundVariables.fills).toEqual([{ type: 'VARIABLE_ALIAS', id: color.id }])
})

test('setBoundVariable rejects paint fields and invalid variables', () => {
  const { frame } = setup()
  expect(() => frame.setBoundVariable('fills', { id: 'x' })).toThrow('bindVariable')
  expect(() => frame.setBoundVariable('width', {} as { id: string })).toThrow('expected a variable or null')
})

test('characters binds a string variable and reads back under the same name', () => {
  const { figma } = setup()
  const collection = figma.createVariableCollection('Copy')
  const copy = figma.createVariable('title', 'STRING', collection.id, 'Hello')
  const text = figma.createText()
  text.setBoundVariable('characters', copy)
  expect(text.boundVariables.characters).toEqual({ type: 'VARIABLE_ALIAS', id: copy.id })
  text.setBoundVariable('characters', null)
  expect(text.boundVariables.characters).toBeUndefined()
})

test('text nodes report run bindings as arrays', () => {
  const { figma, size } = setup()
  const text = figma.createText()
  text.characters = 'Hello world'
  text.setRangeBoundVariable(0, 5, 'fontSize', size)
  text.setRangeBoundVariable(6, 11, 'fontSize', size)
  expect(text.boundVariables.fontSize).toEqual([{ type: 'VARIABLE_ALIAS', id: size.id }])
})
