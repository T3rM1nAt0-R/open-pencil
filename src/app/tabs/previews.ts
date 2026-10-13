import { promiseTimeout } from '@vueuse/core'

import { findFigThumbnailPageId } from '@open-pencil/core/io/formats/fig'
import { renderThumbnail } from '@open-pencil/core/io/formats/raster'

import { DOCUMENT_PREVIEW_SIZE, documentPreviewPageId } from '@/app/document/io/preview-render'
import type { EditorStore } from '@/app/editor/session'
import { usablePreview } from '@/app/integrations/storage'
import { cacheRecentFileThumbnail, loadCachedRecentFileThumbnail } from '@/app/recent-files'
import { getLocalCanvasStore } from '@/app/storage/local-store'
import { enqueuePutThumb } from '@/app/storage/sync/engine'
import { emitStorageWorkspaceEvent } from '@/app/storage/workspace/events'

const coverThumbnailListeners = new WeakMap<EditorStore, () => void>()

export function stopWatchingFigCover(store: EditorStore): void {
  coverThumbnailListeners.get(store)?.()
  coverThumbnailListeners.delete(store)
}

async function renderDocumentPreview(store: EditorStore): Promise<Uint8Array | null> {
  const pageId = documentPreviewPageId(store.graph)
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
    DOCUMENT_PREVIEW_SIZE,
    DOCUMENT_PREVIEW_SIZE
  )
  if (!bytes) console.warn('[Previews] Preview skipped because the page was empty')
  return usablePreview(bytes)
}

export async function cacheOpenedFigCover(path: string, store: EditorStore): Promise<void> {
  if (usablePreview(await loadCachedRecentFileThumbnail(path))) return
  const bytes = await renderDocumentPreview(store)
  if (bytes) await cacheRecentFileThumbnail(path, bytes)
}

/** Draws a preview once for a storage design that has none, then syncs it. */
export async function cacheStorageDocumentPreview(
  documentId: string,
  store: EditorStore
): Promise<void> {
  const local = getLocalCanvasStore()
  if (usablePreview(await local.readThumb(documentId))) return
  const bytes = await renderDocumentPreview(store)
  if (!bytes) return
  const metadata = await local.writeThumb(documentId, bytes)
  if (!metadata) return
  await enqueuePutThumb(documentId, metadata.revision)
  emitStorageWorkspaceEvent({ providerId: metadata.providerId, documentId, kind: 'preview' })
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
