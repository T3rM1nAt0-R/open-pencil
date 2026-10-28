import { describe, expect, test } from 'bun:test'

import { unmetMenuIds } from '@/app/shell/menu/needs'
import type { AppMenuGroupSchema } from '@/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'

const NO_DOCUMENT = { hasDocument: false, hasSelection: false }
const DOCUMENT = { hasDocument: true, hasSelection: false }
const SELECTION = { hasDocument: true, hasSelection: true }

describe('unmetMenuIds', () => {
  test('greys out what needs a document when none is open', () => {
    expect(unmetMenuIds(APP_MENU_SCHEMA, NO_DOCUMENT)).toEqual(
      expect.arrayContaining(['save', 'save-as', 'selection.selectAll', 'zoom-in', 'copy'])
    )
  })

  test('keeps what works anywhere enabled', () => {
    const unmet = unmetMenuIds(APP_MENU_SCHEMA, NO_DOCUMENT)

    for (const id of ['new', 'open', 'close', 'settings', 'theme-dark', 'snap-geometry']) {
      expect(unmet).not.toContain(id)
    }
  })

  test('greys out what needs a selection until one exists', () => {
    const unmet = unmetMenuIds(APP_MENU_SCHEMA, DOCUMENT)

    expect(unmet).toEqual(expect.arrayContaining(['copy', 'selection.delete', 'text.bold']))
    expect(unmet).not.toContain('save')
    expect(unmet).not.toContain('zoom-in')
  })

  test('submenu items follow their parent', () => {
    expect(unmetMenuIds(APP_MENU_SCHEMA, DOCUMENT)).toEqual(
      expect.arrayContaining(['export-selection', 'export-png', 'export-fig'])
    )
    expect(unmetMenuIds(APP_MENU_SCHEMA, SELECTION)).not.toContain('export-png')
  })

  test('enables everything once a document has a selection', () => {
    expect(unmetMenuIds(APP_MENU_SCHEMA, SELECTION)).toEqual([])
  })

  test('an item that needs a selection stays off without a document', () => {
    const schema = [
      { label: 'Test', items: [{ id: 'only-selection', label: 'Only', needs: 'selection' }] }
    ] satisfies AppMenuGroupSchema[]

    expect(unmetMenuIds(schema, NO_DOCUMENT)).toEqual(['only-selection'])
    expect(unmetMenuIds(schema, SELECTION)).toEqual([])
  })
})
