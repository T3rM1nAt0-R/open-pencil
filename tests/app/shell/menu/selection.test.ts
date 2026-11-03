import { expect, test } from 'bun:test'

import {
  menuItemNeedsSelection,
  selectionMenuIds,
  selectionMenuIdsDisabled
} from '@/app/shell/menu/selection'

// The items that act on a selection but have no editor command of their own, so nothing else
// greys them out while nothing is selected.
const ACTS_ON_A_SELECTION = [
  'copy',
  'cut',
  'paste-to-replace',
  'selection.rename',
  'export-selection',
  'export-png',
  'export-svg',
  'export-pptx',
  'export-drawio',
  'export-fig',
  'text.bold',
  'text.italic',
  'text.underline',
  'arrange.align-left',
  'arrange.align-center',
  'arrange.align-right',
  'arrange.align-top',
  'arrange.align-middle',
  'arrange.align-bottom'
]

test('the schema marks every item that acts on a selection and has no command', () => {
  expect([...selectionMenuIds()].toSorted((a, b) => a.localeCompare(b))).toEqual(
    ACTS_ON_A_SELECTION.toSorted((a, b) => a.localeCompare(b))
  )
})

test('leaves out what works with nothing selected', () => {
  for (const id of ['paste', 'save', 'new', 'select-all', 'selection.selectAll', 'edit.undo']) {
    expect(menuItemNeedsSelection(id)).toBe(false)
  }
})

test('greys the selection items out with nothing selected and none with a selection', () => {
  expect(selectionMenuIdsDisabled(false).toSorted((a, b) => a.localeCompare(b))).toEqual(
    ACTS_ON_A_SELECTION.toSorted((a, b) => a.localeCompare(b))
  )
  expect(selectionMenuIdsDisabled(true)).toEqual([])
})
