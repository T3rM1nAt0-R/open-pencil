import { describe, expect, mock, test } from 'bun:test'

import { createShellMenuActions } from '@/app/shell/menu/shell'

import { asDouble } from '#tests/helpers/doubles'

function createActions() {
  const exitApp = mock(() => Promise.resolve())
  const actions = createShellMenuActions({
    setTheme: mock(() => undefined),
    updates: asDouble({ value: {} }),
    exitApp
  })
  return { actions, exitApp }
}

describe('shell menu actions', () => {
  test('File > Exit quits through the shared app exit', () => {
    const { actions, exitApp } = createActions()

    actions.exit?.()

    expect(exitApp).toHaveBeenCalledTimes(1)
  })

  test('the macOS Quit item quits the same way', () => {
    const { actions, exitApp } = createActions()

    actions.quit?.()

    expect(exitApp).toHaveBeenCalledTimes(1)
  })
})
