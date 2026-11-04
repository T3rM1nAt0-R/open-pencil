import { afterEach, beforeEach, expect, test, vi } from 'bun:test'

import { nextTick } from 'vue'

import * as layoutModule from '@open-pencil/core/layout'

import { createTab, getActiveStore } from '@/app/tabs'
import { lastSession } from '@/app/tabs/open/last-session'
import { recordOpenDocuments } from '@/app/tabs/open/startup'

/** Read through a function, as the recorder changes it after the test cleared it. */
const recorded = () => lastSession.value

beforeEach(() => {
  Reflect.defineProperty(globalThis, 'window', {
    value: {
      innerWidth: 1024,
      innerHeight: 768,
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0)
        return 0
      },
      cancelAnimationFrame: vi.fn(),
      openPencil: {},
      location: { href: 'http://localhost/' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    },
    configurable: true,
    writable: true
  })
  Reflect.defineProperty(globalThis, 'document', {
    value: { fonts: { add: vi.fn(), ready: Promise.resolve() } },
    configurable: true,
    writable: true
  })
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  lastSession.value = null
  Reflect.deleteProperty(globalThis, 'window')
  Reflect.deleteProperty(globalThis, 'document')
})

test('a design saved to a file is recorded for the next start without another tab change', async () => {
  createTab()
  recordOpenDocuments(() => true)
  await nextTick()
  lastSession.value = null
  const store = getActiveStore()

  store.setDocumentSource('plan.fig', 'fig', undefined, '/designs/plan.fig')
  await nextTick()

  expect(recorded()?.documents).toContainEqual({ kind: 'local', path: '/designs/plan.fig' })
})

test('a design saved to storage is recorded for the next start', async () => {
  createTab()
  recordOpenDocuments(() => true)
  await nextTick()
  lastSession.value = null
  const store = getActiveStore()

  // Keeping the name means only the binding changed, as when a design is saved to storage.
  store.setStorageDocumentSource({ providerId: 's3', documentId: 'plan' }, store.state.documentName)
  await nextTick()

  expect(recorded()?.documents).toContainEqual(
    expect.objectContaining({ kind: 'storage', documentId: 'plan' })
  )
})
