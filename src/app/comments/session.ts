import { useIntervalFn, useLocalStorage } from '@vueuse/core'
import { ref, shallowRef } from 'vue'

import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/active-store'

import { mergeThreads } from './merge'
import { browserCommentsBackend, shelfCommentsBackend, type CommentsBackend } from './storage'
import type { CommentThread } from './types'

const REFRESH_MS = 10_000
const DOCUMENT_CHECK_MS = 1_000
// Same name the collaboration panel asks for, so people only type it once.
const AUTHOR_KEY = 'op-collab-name'

export type CommentDraft = { pageId: string; x: number; y: number }
export type CommentsStatus = 'idle' | 'loading' | 'saving' | 'error'

// One comments session for the app; it follows whichever document is active.
export const threads = ref<CommentThread[]>([])
export const backend = shallowRef<CommentsBackend | null>(null)
export const commenting = ref(false)
export const panelOpen = ref(false)
export const showResolved = ref(false)
export const activeThreadId = ref<string | null>(null)
export const draft = ref<CommentDraft | null>(null)
export const status = ref<CommentsStatus>('idle')
export const errorMessage = ref<string | null>(null)
export const author = useLocalStorage<string>(AUTHOR_KEY, '')

let boundStore: EditorStore | null = null
let users = 0
let writeChain: Promise<void> = Promise.resolve()

export function setAuthor(name: string) {
  author.value = name.trim()
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomUUID().slice(0, 8)}`
}

export function now(): string {
  return new Date().toISOString()
}

function documentKey(store: EditorStore): string {
  const binding = store.getStorageBinding()
  if (binding) return `storage:${binding.providerId}:${binding.documentId}`
  const path = store.getDocumentFilePath()
  return path ? `file:${path}` : `recovery:${store.getRecoveryId()}`
}

function resolveBackend(store: EditorStore): CommentsBackend {
  const binding = store.getStorageBinding()
  if (binding) {
    const shelf = shelfCommentsBackend(binding)
    if (shelf) return shelf
  }
  const path = store.getDocumentFilePath()
  return browserCommentsBackend(path ? `file:${path}` : `recovery:${store.getRecoveryId()}`)
}

let lastDocumentKey: string | null = null

function fail(error: unknown) {
  status.value = 'error'
  errorMessage.value = error instanceof Error ? error.message : String(error)
  console.warn('[Comments]', error)
}

/** Pick up the open document's comments, and anything added elsewhere since. */
export async function refresh() {
  const store = boundStore
  if (!store) return
  let next = backend.value
  try {
    lastDocumentKey = documentKey(store)
    if (!next || lastDocumentKey !== next.key) next = resolveBackend(store)
  } catch (error) {
    fail(error)
    return
  }
  const switched = backend.value?.key !== next.key
  if (switched) {
    backend.value = next
    threads.value = []
    activeThreadId.value = null
    draft.value = null
    status.value = 'loading'
  }
  try {
    const remote = await next.load()
    if (backend.value?.key !== next.key) return
    threads.value = switched ? remote : mergeThreads(threads.value, remote)
    if (status.value !== 'saving') status.value = 'idle'
    errorMessage.value = null
  } catch (error) {
    fail(error)
  }
}

const poller = useIntervalFn(() => void refresh(), REFRESH_MS, { immediate: false })

// Opening or saving a design changes where its comments live; notice that quickly.
const documentWatcher = useIntervalFn(
  () => {
    if (boundStore && documentKey(boundStore) !== lastDocumentKey) void refresh()
  },
  DOCUMENT_CHECK_MS,
  { immediate: false }
)

/** Change comments locally at once, then join with the stored copy and write it back. */
export function mutate(change: (current: CommentThread[]) => CommentThread[]) {
  threads.value = change(threads.value)
  const target = backend.value
  const store = boundStore
  if (!target || !store) return
  writeChain = writeChain.then(() => persist(target, store.state.documentName))
}

async function persist(target: CommentsBackend, documentName: string) {
  status.value = 'saving'
  try {
    const remote = await target.load()
    const merged = mergeThreads(threads.value, remote)
    await target.save(merged, documentName)
    if (backend.value?.key === target.key) threads.value = mergeThreads(threads.value, merged)
    status.value = 'idle'
    errorMessage.value = null
  } catch (error) {
    fail(error)
  }
}

export function updateThread(id: string, patch: (thread: CommentThread) => CommentThread) {
  mutate((current) =>
    current.map((thread) => (thread.id === id ? { ...patch(thread), updatedAt: now() } : thread))
  )
}

export function pinPosition(store: EditorStore, thread: CommentThread): Vector {
  if (thread.nodeId) {
    const node = store.graph.getNode(thread.nodeId)
    if (node) {
      const abs = store.graph.getAbsolutePosition(node.id)
      return { x: abs.x + (thread.offsetX ?? 0), y: abs.y + (thread.offsetY ?? 0) }
    }
  }
  return { x: thread.x, y: thread.y }
}

export function activeStore(): EditorStore | null {
  return boundStore
}

export function attachStore(store: EditorStore) {
  boundStore = store
  users++
  void refresh()
  poller.resume()
  documentWatcher.resume()
}

export function detachStore() {
  users = Math.max(0, users - 1)
  if (users > 0) return
  poller.pause()
  documentWatcher.pause()
}
