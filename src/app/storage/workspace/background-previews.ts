import { readFigForDisplay } from '@/app/document/io/fig'
import { renderOffscreenPreview } from '@/app/document/io/preview-render'
import {
  activeStorageProviderID,
  createActiveStorageAdapter,
  type StorageProviderID,
  usablePreview
} from '@/app/integrations/storage'
import { getLocalCanvasStore } from '@/app/storage/local-store'
import { enqueuePutThumb } from '@/app/storage/sync/engine'
import { emitStorageWorkspaceEvent } from '@/app/storage/workspace/events'

/** Designs being drawn or already drawn this session, so each is downloaded at most once. */
const attempted = new Map<string, Promise<Uint8Array | null>>()
let queue: Promise<unknown> = Promise.resolve()

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 2000 })
    } else {
      setTimeout(resolve, 0)
    }
  })
}

async function drawPreview(providerId: StorageProviderID, id: string): Promise<Uint8Array | null> {
  await whenIdle()
  if (activeStorageProviderID.value !== providerId) return null
  const local = getLocalCanvasStore()
  const existing = usablePreview(await local.readThumb(id))
  if (existing) return existing
  const metadata = await local.getMeta(id)
  const localFig = metadata?.hasFig ? await local.readFig(id) : null
  if (!localFig && activeStorageProviderID.value !== providerId) return null
  const figBytes = localFig ?? (await createActiveStorageAdapter(providerId).getDocument(id))
  const fileBytes = Uint8Array.from(figBytes)
  const graph = await readFigForDisplay(
    new File([fileBytes.buffer], `${id}.fig`, { type: 'application/octet-stream' })
  )
  const preview = usablePreview(await renderOffscreenPreview(graph))
  if (!preview || activeStorageProviderID.value !== providerId) return preview
  const written = await local.writeThumb(id, preview)
  if (!written) return preview
  await enqueuePutThumb(id, written.revision)
  emitStorageWorkspaceEvent({ providerId, documentId: id, kind: 'preview' })
  return preview
}

async function forgetUnlessDrawn(key: string, drawn: Promise<Uint8Array | null>): Promise<void> {
  if (!(await drawn)) attempted.delete(key)
}

/**
 * Draws a preview for a storage design that has none, one design at a time and only when the
 * page is idle, then keeps it locally and uploads it once. Resolves to null when it cannot.
 */
export function drawMissingStoragePreview(
  providerId: StorageProviderID,
  id: string
): Promise<Uint8Array | null> {
  const key = `${providerId}\0${id}`
  const pending = attempted.get(key)
  if (pending) return pending
  const drawn = queue.then(() =>
    drawPreview(providerId, id).catch((error: unknown) => {
      console.warn('[Storage] Could not draw a preview in the background', error)
      return null
    })
  )
  queue = drawn
  attempted.set(key, drawn)
  // Remember only success, so a later request can try a design that failed again.
  void forgetUnlessDrawn(key, drawn)
  return drawn
}
