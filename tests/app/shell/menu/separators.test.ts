import { describe, expect, test } from 'bun:test'

import { tidyMenuSeparators } from '@/app/shell/menu/separators'

const SEP = { separator: true as const }
const item = (label: string) => ({ label })

describe('tidyMenuSeparators', () => {
  test('drops separators at either end and doubled ones', () => {
    expect(tidyMenuSeparators([SEP, item('a'), SEP, SEP, item('b'), SEP, SEP])).toEqual([
      item('a'),
      SEP,
      item('b')
    ])
  })

  test('leaves a tidy list alone', () => {
    const entries = [item('a'), SEP, item('b')]

    expect(tidyMenuSeparators(entries)).toEqual(entries)
  })

  test('empties a list that was only separators', () => {
    expect(tidyMenuSeparators([SEP, SEP])).toEqual([])
  })
})
