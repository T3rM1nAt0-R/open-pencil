import { computed } from 'vue'

import type { EditorStore } from '@/app/editor/active-store'

import {
  threads,
  backend,
  commenting,
  panelOpen,
  showResolved,
  activeThreadId,
  draft,
  status,
  errorMessage,
  author,
  setAuthor,
  newId,
  now,
  refresh,
  mutate,
  updateThread,
  pinPosition,
  activeStore,
  attachStore,
  detachStore
} from './session'
import type { CommentReply, CommentThread } from './types'

export { pinPosition } from './session'
export type { CommentDraft, CommentsStatus } from './session'

export function useComments() {
  const visibleThreads = computed(() =>
    threads.value.filter((thread) => !thread.deleted && (showResolved.value || !thread.resolved))
  )
  const openCount = computed(
    () => threads.value.filter((thread) => !thread.deleted && !thread.resolved).length
  )

  function setCommenting(on: boolean) {
    commenting.value = on
    if (!on) draft.value = null
  }

  function startDraft(pageId: string, x: number, y: number) {
    activeThreadId.value = null
    draft.value = { pageId, x, y }
  }

  function addThread(text: string) {
    const store = activeStore()
    const place = draft.value
    const body = text.trim()
    if (!store || !place || !body) return
    const hit = store.graph.hitTest(place.x, place.y, place.pageId)
    const abs = hit ? store.graph.getAbsolutePosition(hit.id) : null
    const stamp = now()
    const thread: CommentThread = {
      id: newId('c'),
      pageId: place.pageId,
      pageName: store.graph.getNode(place.pageId)?.name,
      nodeId: hit?.id ?? null,
      nodeName: hit?.name ?? null,
      offsetX: abs ? place.x - abs.x : 0,
      offsetY: abs ? place.y - abs.y : 0,
      x: place.x,
      y: place.y,
      author: author.value || 'Someone',
      text: body,
      createdAt: stamp,
      updatedAt: stamp,
      resolved: false,
      replies: []
    }
    draft.value = null
    activeThreadId.value = thread.id
    mutate((current) => [...current, thread])
  }

  function reply(threadId: string, text: string) {
    const body = text.trim()
    if (!body) return
    const entry: CommentReply = {
      id: newId('r'),
      author: author.value || 'Someone',
      text: body,
      createdAt: now()
    }
    updateThread(threadId, (thread) => ({
      ...thread,
      resolved: false,
      replies: [...thread.replies, entry]
    }))
  }

  function setResolved(threadId: string, resolved: boolean) {
    updateThread(threadId, (thread) => ({
      ...thread,
      resolved,
      resolvedAt: resolved ? now() : null
    }))
    if (resolved && !showResolved.value) activeThreadId.value = null
  }

  function editThread(threadId: string, text: string) {
    const body = text.trim()
    if (!body) return
    updateThread(threadId, (thread) => ({ ...thread, text: body }))
  }

  function deleteThread(threadId: string) {
    updateThread(threadId, (thread) => ({ ...thread, deleted: true }))
    if (activeThreadId.value === threadId) activeThreadId.value = null
  }

  function deleteReply(threadId: string, replyId: string) {
    updateThread(threadId, (thread) => ({
      ...thread,
      replies: thread.replies.map((entry) =>
        entry.id === replyId ? { ...entry, deleted: true } : entry
      )
    }))
  }

  /** Keep the pin where the layer is now, so it stays put if the layer is later deleted. */
  function rememberPosition(store: EditorStore, threadId: string) {
    const thread = threads.value.find((entry) => entry.id === threadId)
    if (!thread) return
    const { x, y } = pinPosition(store, thread)
    if (x !== thread.x || y !== thread.y) updateThread(threadId, (entry) => ({ ...entry, x, y }))
  }

  async function focusThread(store: EditorStore, threadId: string) {
    const thread = threads.value.find((entry) => entry.id === threadId)
    if (!thread) return
    if (store.state.currentPageId !== thread.pageId && store.graph.getNode(thread.pageId)) {
      await store.switchPage(thread.pageId)
    }
    const { x, y } = pinPosition(store, thread)
    const center = store.viewportCanvasCenter()
    store.state.panX = center.x - x * store.state.zoom
    store.state.panY = center.y - y * store.state.zoom
    store.requestRepaint()
    draft.value = null
    activeThreadId.value = threadId
  }

  return {
    threads,
    visibleThreads,
    openCount,
    backend,
    commenting,
    panelOpen,
    showResolved,
    activeThreadId,
    draft,
    status,
    errorMessage,
    author,
    setAuthor,
    attach: attachStore,
    detach: detachStore,
    refresh,
    setCommenting,
    startDraft,
    addThread,
    reply,
    setResolved,
    editThread,
    deleteThread,
    deleteReply,
    rememberPosition,
    focusThread
  }
}
