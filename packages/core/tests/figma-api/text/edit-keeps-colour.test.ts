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

describe('editing coloured text', () => {
  test('inserting before a coloured run moves the run with its characters', () => {
    const text = coloured('one two three', 4, 7)
    text.insertCharacters(0, 'zero ')

    expect(text.characters).toBe('zero one two three')
    expect(redCharacters(text)).toEqual(['two'])
  })

  test('deleting before a coloured run moves the run with its characters', () => {
    const text = coloured('one two three', 8, 13)
    text.deleteCharacters(0, 4)

    expect(redCharacters(text)).toEqual(['three'])
  })

  test('replacing a whole coloured word gives the new word its colour', () => {
    const text = coloured('one two three', 4, 7)
    text.characters = 'one six three'

    expect(redCharacters(text)).toEqual(['six'])
  })

  test('replacing letters inside a coloured word keeps the word coloured', () => {
    const text = coloured('one seven three', 4, 9)
    text.characters = 'one sexen three'

    expect(redCharacters(text)).toEqual(['sexen'])
  })

  test('setting new characters keeps the colour of the text around the change', () => {
    const text = coloured('dot ● one\ndot ● two', 4, 5)
    text.characters = 'dot ● one\nnew line\ndot ● two'

    expect(redCharacters(text)).toEqual(['●'])
    expect(text.characters.indexOf('●')).toBe(4)
  })
})
