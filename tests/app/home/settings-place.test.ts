import { afterEach, describe, expect, test } from 'bun:test'

import {
  homeLocation,
  setHomeLeaveGuard,
  showHomeWorkspace,
  type HomeLocation
} from '@/app/home/location'
import { selectHomeLocation, showHomeSettings } from '@/app/home/locations'
import { homeSettingsSection, type SettingsSection } from '@/app/settings/dialog'

/** Read through a function, as the guard changes it after the test set it. */
function shownLocation(): HomeLocation {
  return homeLocation.value
}

function shownSection(): SettingsSection {
  return homeSettingsSection.value
}

afterEach(() => {
  homeLocation.value = { kind: 'recent' }
  homeSettingsSection.value = 'general'
  setHomeLeaveGuard(null)
})

describe('Settings as a place on Home', () => {
  test('shows Settings at the section asked for', () => {
    showHomeSettings('storage')

    expect(shownLocation()).toEqual({ kind: 'settings' })
    expect(shownSection()).toBe('storage')
  })

  test('waits for the shown page to agree before switching', () => {
    homeLocation.value = { kind: 'settings' }
    homeSettingsSection.value = 'general'
    const held: (() => void)[] = []
    setHomeLeaveGuard((proceed) => held.push(proceed))

    showHomeSettings('cloud')
    expect(shownSection()).toBe('general')

    held[0]?.()
    expect(shownSection()).toBe('cloud')
  })

  test('does not ask again when Settings already shows the section', () => {
    homeLocation.value = { kind: 'settings' }
    homeSettingsSection.value = 'storage'
    const asked: (() => void)[] = []
    setHomeLeaveGuard((proceed) => asked.push(proceed))

    showHomeSettings('storage')

    expect(asked).toHaveLength(0)
    expect(shownSection()).toBe('storage')
  })
})

describe('choosing a place on Home', () => {
  test('asks the shown page before moving to another place', () => {
    homeLocation.value = { kind: 'settings' }
    const held: (() => void)[] = []
    setHomeLeaveGuard((proceed) => held.push(proceed))

    selectHomeLocation({ kind: 'storage', id: 'storage' })
    expect(shownLocation()).toEqual({ kind: 'settings' })

    held[0]?.()
    expect(shownLocation()).toEqual({ kind: 'storage' })
  })

  test('does not ask when the place is already shown', () => {
    homeLocation.value = { kind: 'settings' }
    const asked: (() => void)[] = []
    setHomeLeaveGuard((proceed) => asked.push(proceed))

    selectHomeLocation({ kind: 'settings', id: 'settings' })

    expect(asked).toHaveLength(0)
    expect(shownLocation()).toEqual({ kind: 'settings' })
  })

  test('shows a new workspace only once the shown page agrees to be left', () => {
    homeLocation.value = { kind: 'settings' }
    const held: (() => void)[] = []
    setHomeLeaveGuard((proceed) => held.push(proceed))

    showHomeWorkspace('workspace-1')
    expect(shownLocation()).toEqual({ kind: 'settings' })

    held[0]?.()
    expect(shownLocation()).toEqual({ kind: 'workspace', id: 'workspace-1' })
  })
})
