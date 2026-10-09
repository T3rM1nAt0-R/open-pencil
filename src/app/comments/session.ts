import { useLocalStorage } from '@vueuse/core'
import { ref } from 'vue'

import type { CommentThread } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/active-store'
import type { PresencePoint } from '@/app/presence/types'

import { readDocumentComments, writeDocumentComments } from './document'
import type { CommentsScope, CommentsSort, CommentsTab } from './list'

// Same name the collaboration panel asks for, so people only type it once.
const AUTHOR_KEY = 'op-collab-name'

/** Where a comment is being written: a canvas point on a page. */
export type CommentDraft = PresencePoint

// One comments session for the app; it follows whichever document is active.
export const threads = ref<CommentThread[]>([])
export const commenting = ref(false)
export const panelOpen = ref(false)
export const listTab = ref<CommentsTab>('open')
export const listQuery = ref('')
export const listScope = useLocalStorage<CommentsScope>('op-comments-scope', 'all')
export const listSort = useLocalStorage<CommentsSort>('op-comments-sort', 'newest')
export const listOnlyMine = useLocalStorage('op-comments-only-mine', false)
export const pendingDeleteId = ref<string | null>(null)
export const activeThreadId = ref<string | null>(null)
export const draft = ref<CommentDraft | null>(null)
export const author = useLocalStorage<string>(AUTHOR_KEY, '')

let boundStore: EditorStore | null = null
let users = 0
let unsubscribe: (() => void) | null = null
let refreshQueued = false

export function setAuthor(name: string) {
  author.value = name.trim()
}

/** Comment mode: the next click on the canvas places a comment. */
export function setCommenting(on: boolean) {
  commenting.value = on
  if (!on) draft.value = null
}

export function toggleCommenting() {
  setCommenting(!commenting.value)
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomUUID().slice(0, 8)}`
}

export function now(): string {
  return new Date().toISOString()
}

/** Shows the comments the open document holds now. */
function refresh() {
  if (boundStore) threads.value = readDocumentComments(boundStore.graph)
}

function queueRefresh() {
  if (refreshQueued) return
  refreshQueued = true
  queueMicrotask(() => {
    refreshQueued = false
    refresh()
  })
}

/** Another document is open: nothing from the last one stays selected or half-written. */
function forgetDocument() {
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
      return { x: abs.x + (thread.offsetX ?? 0), y: abs.y + (thread.offsetY ?? 0) }
    }
  }
  return { x: thread.x, y: thread.y }
}

export function activeStore(): EditorStore | null {
  return boundStore
}

function subscribe(store: EditorStore) {
  const stops = [
    // Comments change on the document node: here, from a collaborator, or by opening a file.
    store.onEditorEvent('node:updated', (id) => {
      if (id === store.graph.rootId) queueRefresh()
    }),
    // A collaboration room can bring its own document node.
    store.onEditorEvent('node:created', (node) => {
      if (node.parentId === null) queueRefresh()
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
