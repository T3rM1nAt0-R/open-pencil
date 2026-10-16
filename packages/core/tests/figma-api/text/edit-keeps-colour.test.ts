import { describe, expect, test } from 'bun:test'

import { FigmaAPI, SceneGraph } from '@open-pencil/core'

const RED = [{ type: 'SOLID' as const, color: { r: 1, g: 0, b: 0 } }]

function coloured(characters: string, start: number, end: number) {
  const api = new FigmaAPI(new SceneGraph())
  const text = api.createText()
  text.characters = characters
  text.setRangeFills(start, end, RED)
  return text
}

function redCharacters(text: ReturnType<typeof coloured>) {
  return text
    .getStyledTextSegments(['fills'])
    .filter((segment) => {
      const [fill] = segment.fills as typeof RED
      return fill?.color.r === 1 && fill.color.g === 0
    })
    .map((segment) => segment.characters)
}

// What Figma's plugin API documents for insertCharacters, deleteCharacters and characters.
describe('editing coloured text through the plugin API', () => {
  test('inserting before a coloured run moves the run with its characters', () => {
    const text = coloured('one two three', 4, 7)
    text.insertCharacters(0, 'zero ')

    expect(text.characters).toBe('zero one two three')
    expect(redCharacters(text)).toEqual(['two'])
  })

  test('inserted characters copy the preceding character, so typing on after a run extends it', () => {
    const text = coloured('one two three', 4, 7)
    text.insertCharacters(7, 's')

    expect(redCharacters(text)).toEqual(['twos'])
  })

  test('with AFTER, inserted characters copy the following character', () => {
    const text = coloured('one two three', 4, 7)
    text.insertCharacters(4, 'big ', 'AFTER')
    text.insertCharacters(11, '!', 'AFTER')

    expect(text.characters).toBe('one big two! three')
    expect(redCharacters(text)).toEqual(['big two'])
  })

  test('at the start of the text, inserted characters copy the closest character', () => {
    const text = coloured('two three', 0, 3)
    text.insertCharacters(0, 'one ')

    expect(redCharacters(text)).toEqual(['one two'])
  })

  test('a long insert keeps the styles around it', () => {
    const text = coloured('one two three', 4, 7)
    text.insertCharacters(4, 'x'.repeat(200_000), 'AFTER')

    expect(text.characters.length).toBe(13 + 200_000)
    expect(redCharacters(text)).toEqual([`${'x'.repeat(200_000)}two`])
  })

  test('deleting before a coloured run moves the run with its characters', () => {
    const text = coloured('one two three', 8, 13)
    text.deleteCharacters(0, 4)

    expect(redCharacters(text)).toEqual(['three'])
  })

  test('deleting across the start of a coloured run keeps the characters left in it', () => {
    const text = coloured('one two three', 8, 13)
    text.deleteCharacters(6, 10)

    expect(text.characters).toBe('one twree')
    expect(redCharacters(text)).toEqual(['ree'])
  })

  test('deleting inside a coloured run shortens the run and keeps the rest coloured', () => {
    const text = coloured('one seven three', 4, 9)
    text.deleteCharacters(5, 7)

    expect(text.characters).toBe('one sen three')
    expect(redCharacters(text)).toEqual(['sen'])
  })

  test('setting characters resets range styles, leaving the style of the first character', () => {
    const middle = coloured('one two three', 4, 7)
    middle.characters = 'one six three'
    expect(redCharacters(middle)).toEqual([])

    const first = coloured('one two three', 0, 3)
    first.characters = 'six seven'
    expect(redCharacters(first)).toEqual(['six seven'])
  })

  test('an unknown useStyle is refused', () => {
    const text = coloured('one', 0, 1)
    expect(() => text.insertCharacters(0, 'x', 'MIDDLE' as never)).toThrow('useStyle')
  })
})
