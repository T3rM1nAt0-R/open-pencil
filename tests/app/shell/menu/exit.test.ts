import { describe, expect, test } from 'bun:test'

import type { AppMenuEntry } from '@/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'

function fileMenuEntries(): AppMenuEntry[] {
  return APP_MENU_SCHEMA.find((group) => group.label === 'File')?.items ?? []
}

describe('File menu Exit', () => {
  const exitEntry = () =>
    fileMenuEntries().find((entry) => entry.type !== 'separator' && entry.id === 'exit')

  test('is a native-only File item handled by the shell, so the browser menu has none', () => {
    expect(exitEntry()).toEqual(
      expect.objectContaining({ id: 'exit', target: 'native', handler: 'shell' })
    )
  })

  test('is the last item of the File menu, below a separator', () => {
    const entries = fileMenuEntries()
    expect(entries.at(-1)).toBe(exitEntry())
    expect(entries.at(-2)).toEqual({ type: 'separator', target: 'native' })
  })
})
