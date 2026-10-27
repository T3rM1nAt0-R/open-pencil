import { afterEach, describe, expect, test } from 'bun:test'

import { createMemoryHistory, createRouter } from 'vue-router'

import { homeLocation, setHomeLeaveGuard, type HomeLocation } from '@/app/home/location'
import {
  activeStorageProviderID,
  storageProviderRegistry,
  writeStoragePreference
} from '@/app/integrations/storage'
import { registerSettingsNavigation, settingsDialogOpen } from '@/app/settings/dialog'
import { browseFiles } from '@/app/shell/menu/navigation'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { render: () => null } },
    { path: '/elsewhere', component: { render: () => null } }
  ]
})

/** Read through a function, as browsing changes it after the test set it. */
function shownLocation(): HomeLocation {
  return homeLocation.value
}

/** Lets the navigation browsing starts, and the tab switch that follows it, finish. */
async function settled(): Promise<void> {
  for (let turn = 0; turn < 4; turn++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

function setUpBucket(): void {
  const providerID = activeStorageProviderID.value
  for (const field of storageProviderRegistry.get(providerID).preferenceFields) {
    if (field.required) writeStoragePreference(providerID, field.id, 'configured')
  }
}

afterEach(() => {
  const providerID = activeStorageProviderID.value
  for (const field of storageProviderRegistry.get(providerID).preferenceFields) {
    writeStoragePreference(providerID, field.id, '')
  }
  homeLocation.value = { kind: 'recent' }
  settingsDialogOpen.value = false
  setHomeLeaveGuard(null)
})

describe('browsing files from the File menu', () => {
  test('opens Home where it was left when no storage is set up', async () => {
    homeLocation.value = { kind: 'shared' }
    await router.push('/elsewhere')

    browseFiles(router)
    await settled()

    expect(shownLocation()).toEqual({ kind: 'shared' })
    expect(router.currentRoute.value.path).toBe('/')
  })

  test('opens Home on the storage bucket once it is set up', async () => {
    setUpBucket()
    homeLocation.value = { kind: 'recent' }
    await router.push('/elsewhere')

    browseFiles(router)
    await settled()

    expect(shownLocation()).toEqual({ kind: 'storage' })
    expect(router.currentRoute.value.path).toBe('/')
  })

  test('waits for the open Settings window to agree to close before changing Home', async () => {
    setUpBucket()
    homeLocation.value = { kind: 'recent' }
    await router.push('/elsewhere')
    settingsDialogOpen.value = true
    const held: (() => void)[] = []
    const unregister = registerSettingsNavigation((action) => held.push(action))

    browseFiles(router)
    await settled()
    expect(shownLocation()).toEqual({ kind: 'recent' })
    expect(router.currentRoute.value.path).toBe('/elsewhere')
    expect(settingsDialogOpen.value).toBe(true)

    held[0]?.()
    await settled()
    unregister()
    expect(shownLocation()).toEqual({ kind: 'storage' })
    expect(router.currentRoute.value.path).toBe('/')
    expect(settingsDialogOpen.value).toBe(false)
  })

  test('never lands on Settings when browsing files', async () => {
    homeLocation.value = { kind: 'settings' }

    browseFiles(router)
    await settled()

    expect(shownLocation()).toEqual({ kind: 'recent' })
  })

  test('waits for the shown Home page to agree before leaving it', async () => {
    homeLocation.value = { kind: 'settings' }
    const held: (() => void)[] = []
    setHomeLeaveGuard((next) => held.push(next))

    browseFiles(router)
    await settled()
    expect(shownLocation()).toEqual({ kind: 'settings' })

    held[0]?.()
    await settled()
    expect(shownLocation()).toEqual({ kind: 'recent' })
  })
})
