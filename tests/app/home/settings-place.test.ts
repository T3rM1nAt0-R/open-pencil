import { afterEach, describe, expect, test } from 'bun:test'

import { homeLocation, setHomeLeaveGuard, type HomeLocation } from '@/app/home/location'
import { showHomeSettings } from '@/app/home/locations'
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
})
