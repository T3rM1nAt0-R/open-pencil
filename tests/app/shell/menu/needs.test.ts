import { describe, expect, test } from 'bun:test'

import { menuItemStates } from '@/app/shell/menu/needs'
import type { AppMenuGroupSchema } from '@/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'

const NO_DOCUMENT = { hasDocument: false, hasSelection: false }
const DOCUMENT = { hasDocument: true, hasSelection: false }
const SELECTION = { hasDocument: true, hasSelection: true }

describe('menuItemStates', () => {
  test('hides what needs a document when none is open', () => {
    const { hidden, disabled } = menuItemStates(APP_MENU_SCHEMA, NO_DOCUMENT)

    expect(hidden).toEqual(
      expect.arrayContaining(['save', 'save-as', 'selection.selectAll', 'zoom-in', 'copy'])
    )
    expect(disabled).toEqual([])
  })

  test('hides what needs a selection too when there is no document', () => {
    expect(menuItemStates(APP_MENU_SCHEMA, NO_DOCUMENT).hidden).toEqual(
      expect.arrayContaining(['selection.delete', 'text.bold', 'selection.group'])
    )
  })

  test('keeps what works anywhere', () => {
    const { hidden, disabled } = menuItemStates(APP_MENU_SCHEMA, NO_DOCUMENT)

    for (const id of ['new', 'open', 'close', 'settings', 'theme-dark', 'snap-geometry']) {
      expect(hidden).not.toContain(id)
      expect(disabled).not.toContain(id)
    }
  })

  test('greys out what needs a selection once a document is open', () => {
    const { hidden, disabled } = menuItemStates(APP_MENU_SCHEMA, DOCUMENT)

    expect(hidden).toEqual([])
    expect(disabled).toEqual(
      expect.arrayContaining(['copy', 'selection.delete', 'text.bold', 'selection.group'])
    )
    expect(disabled).not.toContain('save')
    expect(disabled).not.toContain('zoom-in')
  })

  test('submenu items follow their parent', () => {
    expect(menuItemStates(APP_MENU_SCHEMA, DOCUMENT).disabled).toEqual(
      expect.arrayContaining(['export-selection', 'export-png', 'export-fig'])
    )
    expect(menuItemStates(APP_MENU_SCHEMA, SELECTION).disabled).not.toContain('export-png')
  })

  test('shows and enables everything once a document has a selection', () => {
    expect(menuItemStates(APP_MENU_SCHEMA, SELECTION)).toEqual({ hidden: [], disabled: [] })
  })

  test('an item that names its own need follows it', () => {
    const schema = [
      { label: 'Test', items: [{ id: 'only-selection', label: 'Only', needs: 'selection' }] }
    ] satisfies AppMenuGroupSchema[]

    expect(menuItemStates(schema, NO_DOCUMENT).hidden).toEqual(['only-selection'])
    expect(menuItemStates(schema, DOCUMENT).disabled).toEqual(['only-selection'])
    expect(menuItemStates(schema, SELECTION)).toEqual({ hidden: [], disabled: [] })
  })
})
