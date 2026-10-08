import { useLocalStorage } from '@vueuse/core'

import { STORAGE_DOCUMENTS_PREFIX } from '@/app/integrations/storage/namespace'
import { createActiveStorageAdapter } from '@/app/integrations/storage/runtime'
import type { StorageDocumentBinding } from '@/app/integrations/storage/types'

import { parseCommentsFile } from './merge'
import { COMMENTS_FILE_VERSION, type CommentThread } from './types'

export function documentCommentsKey(documentId: string): string {
  return `${STORAGE_DOCUMENTS_PREFIX}${documentId}.comments.json`
}

/** Where one document's comments are read from and written to. */
export type CommentsBackend = {
  /** Stable identity; a change means a different document is open. */
  key: string
  shared: boolean
  load(): Promise<CommentThread[]>
  save(threads: CommentThread[], documentName: string): Promise<void>
}

function encode(documentId: string, documentName: string, threads: CommentThread[]): Uint8Array {
  return new TextEncoder().encode(
    `${JSON.stringify({ version: COMMENTS_FILE_VERSION, documentId, documentName, threads }, null, 2)}\n`
  )
}

export function shelfCommentsBackend(binding: StorageDocumentBinding): CommentsBackend | null {
  const objects = createActiveStorageAdapter(binding.providerId).libraryObjects
  if (!objects) return null
  const objectKey = documentCommentsKey(binding.documentId)
  return {
    key: `storage:${binding.providerId}:${binding.documentId}`,
    shared: true,
    async load() {
      return parseCommentsFile(await objects.getObject(objectKey))
    },
    async save(threads, documentName) {
      await objects.putObject(
        objectKey,
        encode(binding.documentId, documentName, threads),
        'application/json'
      )
    }
  }
}

const browserBackends = new Map<string, CommentsBackend>()

export function browserCommentsBackend(documentKey: string): CommentsBackend {
  const known = browserBackends.get(documentKey)
  if (known) return known
  const stored = useLocalStorage<string>(`open-pencil:comments:${documentKey}`, '')
  const created: CommentsBackend = {
    key: documentKey,
    shared: false,
    async load() {
      return parseCommentsFile(stored.value ? new TextEncoder().encode(stored.value) : null)
    },
    async save(threads, documentName) {
      stored.value = new TextDecoder().decode(encode(documentKey, documentName, threads))
    }
  }
  browserBackends.set(documentKey, created)
  return created
}
