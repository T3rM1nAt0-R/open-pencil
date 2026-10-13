import 'fake-indexeddb/auto'
import { describe, expect, spyOn, test } from 'bun:test'

import type * as Thumbnails from '@/app/recent-files/thumbnails'

describe('recent file thumbnails without IndexedDB', () => {
  test('load, cache, and clear log and resolve instead of rejecting', async () => {
    const open = spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('IndexedDB unavailable')
    })
    // A fresh module copy, so no connection opened by another test is reused.
    const freshCopy = '../../../src/app/recent-files/thumbnails.ts?unavailable'
    const thumbnails = (await import(freshCopy)) as typeof Thumbnails
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      expect(await thumbnails.loadCachedRecentFileThumbnail('design.fig')).toBeNull()
      await thumbnails.cacheRecentFileThumbnail('design.fig', new Uint8Array(4096).fill(0x89, 0, 1))
      await thumbnails.clearRecentFileThumbnails()
      expect(warn.mock.calls.length).toBeGreaterThanOrEqual(2)
    } finally {
      warn.mockRestore()
      open.mockRestore()
    }
  })
})
