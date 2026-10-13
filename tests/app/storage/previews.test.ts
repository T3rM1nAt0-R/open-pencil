import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import {
  DOCUMENT_THUMBNAIL_CONTENT_TYPE,
  documentThumbnailKey,
  legacyDocumentThumbnailKey
} from '@/app/integrations/storage/namespace'
import {
  MIN_PREVIEW_BYTES,
  previewMimeType,
  usablePreview
} from '@/app/integrations/storage/preview-bytes'
import {
  cacheRecentFileThumbnail,
  clearRecentFileThumbnails,
  loadRecentFileThumbnail
} from '@/app/recent-files/thumbnails'

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function png(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  bytes.set(PNG)
  return bytes
}

describe('design previews', () => {
  test('store PNG bytes under a PNG key with a PNG content type', () => {
    expect(documentThumbnailKey('a')).toEndWith('a.thumb.png')
    expect(legacyDocumentThumbnailKey('a')).toEndWith('a.thumb.jpg')
    expect(DOCUMENT_THUMBNAIL_CONTENT_TYPE).toBe('image/png')
    expect(previewMimeType(png(MIN_PREVIEW_BYTES))).toBe(DOCUMENT_THUMBNAIL_CONTENT_TYPE)
  })

  test('treat a missing, blank or non-image preview as missing', () => {
    expect(usablePreview(null)).toBeNull()
    expect(usablePreview(png(70))).toBeNull()
    expect(usablePreview(new Uint8Array(4096))).toBeNull()
    const real = png(4096)
    expect(usablePreview(real)).toBe(real)
    const jpeg = new Uint8Array(4096)
    jpeg.set([0xff, 0xd8, 0xff])
    expect(previewMimeType(jpeg)).toBe('image/jpeg')
  })

  test('keep recent-file previews in the browser and never cache a blank one', async () => {
    await clearRecentFileThumbnails()
    await cacheRecentFileThumbnail('/designs/blank.fig', png(70))
    expect(await loadRecentFileThumbnail('/designs/blank.fig')).toBeNull()
    const real = png(2048)
    await cacheRecentFileThumbnail('/designs/real.fig', real)
    expect(await loadRecentFileThumbnail('/designs/real.fig')).toEqual(real)
    await clearRecentFileThumbnails()
    expect(await loadRecentFileThumbnail('/designs/real.fig')).toBeNull()
  })
})
