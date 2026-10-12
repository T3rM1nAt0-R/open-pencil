import { promiseTimeout } from '@vueuse/core'

import { findFigThumbnailPageId } from '@open-pencil/core/io/formats/fig'
import { renderThumbnail } from '@open-pencil/core/io/formats/raster'

import type { EditorStore } from '@/app/editor/session'
import { cacheRecentFileThumbnail, loadCachedRecentFileThumbnail } from '@/app/recent-files'
import { getLocalCanvasStore } from '@/app/storage/local-store'
import { enqueuePutThumb } from '@/app/storage/sync/engine'

const PREVIEW_SIZE = 512
const coverThumbnailListeners = new WeakMap<EditorStore, () => void>()

export function stopWatchingFigCover(store: EditorStore): void {
  coverThumbnailListeners.get(store)?.()
  coverThumbnailListeners.delete(store)
}

async function renderDocumentPreview(store: EditorStore): Promise<Uint8Array | null> {
  const pages = store.graph.getPages()
  const pageId = findFigThumbnailPageId(pages) ?? pages[0]?.id
  if (!pageId) return null
  for (let attempt = 0; attempt < 240 && !store.renderer; attempt++) {
    await promiseTimeout(250)
  }
  const renderer = store.renderer
  if (!renderer) {
    console.warn('[Previews] Preview skipped because the renderer was unavailable')
    return null
  }
  const bytes = renderThumbnail(
    renderer.ck,
    renderer,
    store.graph,
    pageId,
    PREVIEW_SIZE,
    PREVIEW_SIZE
  )
  if (!bytes) console.warn('[Previews] Preview skipped because the page was empty')
  return bytes ?? null
}

export async function cacheOpenedFigCover(path: string, store: EditorStore): Promise<void> {
  if (await loadCachedRecentFileThumbnail(path)) return
  const bytes = await renderDocumentPreview(store)
  if (bytes) await cacheRecentFileThumbnail(path, bytes)
}

/** Draws a preview once for a storage design that has none, then syncs it. */
export async function cacheStorageDocumentPreview(
  documentId: string,
  store: EditorStore
): Promise<void> {
  const local = getLocalCanvasStore()
  if ((await local.readThumb(documentId))?.byteLength) return
  const bytes = await renderDocumentPreview(store)
  if (!bytes) return
  const metadata = await local.writeThumb(documentId, bytes)
  if (metadata) await enqueuePutThumb(documentId, metadata.revision)
}

export function watchOpenedFigCover(path: string, store: EditorStore): void {
  coverThumbnailListeners.get(store)?.()
  const coverPageId = findFigThumbnailPageId(store.graph.getPages())
  if (!coverPageId) return
  coverThumbnailListeners.set(
    store,
    store.onEditorEvent('page:changed', (pageId) => {
      if (pageId !== coverPageId) return
      void cacheOpenedFigCover(path, store).catch((error) => {
        console.warn('[Recent files] Failed to cache the Cover thumbnail', error)
      })
    })
  )
}
