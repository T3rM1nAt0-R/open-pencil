import { useLocalStorage } from '@vueuse/core'
import { ref } from 'vue'

import type { CommentThread } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'
import { randomHex } from '@open-pencil/scene-graph/random'

import type { EditorStore } from '@/app/editor/active-store'
import type { PresencePoint } from '@/app/presence/types'

import { readDocumentComments, writeDocumentComments } from './document'
import type { CommentsSort } from './list'
import { hasNewerComments, mergeThreads } from './merge'

/** Where a comment is being written: a canvas point on a page. */
export type CommentDraft = PresencePoint

// One comments session for the app; it follows whichever document is active.
export const threads = ref<CommentThread[]>([])
/** Shift+C: pins stay off the canvas until the Comment tool is picked again. */
export const pinsHidden = useLocalStorage('op-comments-hidden', false)
export const listQuery = ref('')
export const listShowResolved = useLocalStorage('op-comments-show-resolved', false)
export const listOnlyPage = useLocalStorage('op-comments-only-page', false)
export const listSort = useLocalStorage<CommentsSort>('op-comments-sort', 'newest')
export const listOnlyMine = useLocalStorage('op-comments-only-mine', false)
export const pendingDeleteId = ref<string | null>(null)
export const activeThreadId = ref<string | null>(null)
export const draft = ref<CommentDraft | null>(null)

let boundStore: EditorStore | null = null
let users = 0
let unsubscribe: (() => void) | null = null
let reconcileQueued = false
// Where each pin was last drawn on its layer, so deleting the layer leaves the pin there.
const lastSeen = new Map<string, Vector>()

export function togglePinsHidden() {
  pinsHidden.value = !pinsHidden.value
}

/** Escape closes an unsent comment or an open thread before it leaves the Comment tool. */
export function dismissComment(): boolean {
  if (draft.value) {
    draft.value = null
    return true
  }
  if (activeThreadId.value) {
    activeThreadId.value = null
    return true
  }
  return false
}

export function newId(prefix: string): string {
  return `${prefix}_${randomHex(8)}`
}

export function now(): string {
  return new Date().toISOString()
}

/** Shows the comments the open document holds now. */
function refresh() {
  if (boundStore) threads.value = readDocumentComments(boundStore.graph)
}

/**
 * The document's comments changed under this session. A collaborator's save replaces them
 * whole, so when two people comment at once one copy wins; whatever this session had that the
 * winning copy lacks is merged back in and written again.
 */
function reconcile() {
  const store = boundStore
  if (!store) return
  const incoming = readDocumentComments(store.graph)
  if (!hasNewerComments(threads.value, incoming)) {
    threads.value = incoming
    return
  }
  const merged = mergeThreads(threads.value, incoming)
  writeDocumentComments(store.graph, merged)
  threads.value = merged
}

function queueReconcile() {
  if (reconcileQueued) return
  reconcileQueued = true
  queueMicrotask(() => {
    reconcileQueued = false
    reconcile()
  })
}

/** Another document is open: nothing from the last one stays selected or half-written. */
function forgetDocument() {
  lastSeen.clear()
  activeThreadId.value = null
  draft.value = null
  pendingDeleteId.value = null
  refresh()
}

/**
 * Changes the open document's comments. The change starts from what the document holds, which
 * includes edits a collaborator synced since this session last read it.
 */
export function mutate(change: (current: CommentThread[]) => CommentThread[]) {
  const store = boundStore
  if (!store) return
  const next = change(readDocumentComments(store.graph))
  writeDocumentComments(store.graph, next)
  threads.value = next
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
      const at = { x: abs.x + (thread.offsetX ?? 0), y: abs.y + (thread.offsetY ?? 0) }
      lastSeen.set(thread.id, at)
      return at
    }
  }
  return { x: thread.x, y: thread.y }
}

/** The layer a pin followed is gone: the pin stays where it was last seen, on the canvas. */
function detachFromLayer(nodeId: string) {
  if (!threads.value.some((thread) => thread.nodeId === nodeId)) return
  mutate((current) =>
    current.map((thread) => {
      if (thread.nodeId !== nodeId) return thread
      const at = lastSeen.get(thread.id) ?? { x: thread.x, y: thread.y }
      return { ...thread, nodeId: null, x: at.x, y: at.y, updatedAt: now() }
    })
  )
}

export function activeStore(): EditorStore | null {
  return boundStore
}

function subscribe(store: EditorStore) {
  const stops = [
    // Comments change on the document node: here, from a collaborator, or by opening a file.
    store.onEditorEvent('node:updated', (id) => {
      if (id === store.graph.rootId) queueReconcile()
    }),
    // A collaboration room can bring its own document node, with its own comments.
    store.onEditorEvent('node:created', (node) => {
      if (node.parentId === null) queueMicrotask(refresh)
    }),
    store.onEditorEvent('node:deleted', (id) => {
      queueMicrotask(() => detachFromLayer(id))
    }),
    store.onEditorEvent('graph:replaced', forgetDocument)
  ]
  return () => {
    for (const stop of stops) stop()
  }
}

export function attachStore(store: EditorStore) {
  users++
  if (boundStore === store) return
  unsubscribe?.()
  boundStore = store
  unsubscribe = subscribe(store)
  forgetDocument()
}

export function detachStore() {
  users = Math.max(0, users - 1)
  if (users > 0) return
  unsubscribe?.()
  unsubscribe = null
  boundStore = null
}
