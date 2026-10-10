import type { CommentReply, CommentThread } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { useCollabIdentity } from '@/app/collab/identity'
import type { EditorStore } from '@/app/editor/active-store'

import {
  threads,
  pinsHidden,
  listQuery,
  listShowResolved,
  listOnlyPage,
  listSort,
  listOnlyMine,
  pendingDeleteId,
  activeThreadId,
  draft,
  newId,
  now,
  mutate,
  updateThread,
  pinPosition,
  activeStore,
  attachStore,
  detachStore
} from './session'

export { pinPosition } from './session'

/**
 * Where a pin at a canvas point is kept: on the top-level layer under it, so it follows that
 * layer, as Figma attaches comments; on the canvas when nothing is there.
 */
function anchorAt(store: EditorStore, pageId: string, at: Vector) {
  const hit = store.graph.hitTest(at.x, at.y, pageId)
  const abs = hit ? store.graph.getAbsolutePosition(hit.id) : null
  return {
    nodeId: hit?.id ?? null,
    nodeName: hit?.name ?? null,
    offsetX: abs ? at.x - abs.x : 0,
    offsetY: abs ? at.y - abs.y : 0,
    x: at.x,
    y: at.y
  }
}

export function useComments() {
  const identity = useCollabIdentity()

  /** A dragged pin lands on whatever is under it now, as in Figma. */
  function movePin(threadId: string, at: Vector) {
    const store = activeStore()
    if (!store) return
    updateThread(threadId, (thread) => ({ ...thread, ...anchorAt(store, thread.pageId, at) }))
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
    const stamp = now()
    const thread: CommentThread = {
      id: newId('c'),
      pageId: place.pageId,
      pageName: store.graph.getNode(place.pageId)?.name,
      ...anchorAt(store, place.pageId, place),
      author: identity.name.value,
      authorColor: identity.color,
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
      author: identity.name.value,
      authorColor: identity.color,
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
    // A resolved thread leaves the canvas unless resolved comments are shown.
    if (resolved && !listShowResolved.value && activeThreadId.value === threadId) {
      activeThreadId.value = null
    }
  }

  function deleteThread(threadId: string) {
    updateThread(threadId, (thread) => ({ ...thread, deleted: true }))
    if (activeThreadId.value === threadId) activeThreadId.value = null
  }

  /** Ask before deleting; the comments layer shows the confirmation. */
  function requestDelete(threadId: string) {
    pendingDeleteId.value = threadId
  }

  function deleteReply(threadId: string, replyId: string) {
    updateThread(threadId, (thread) => ({
      ...thread,
      replies: thread.replies.map((entry) =>
        entry.id === replyId ? { ...entry, deleted: true } : entry
      )
    }))
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
    pinsHidden,
    listQuery,
    listShowResolved,
    listOnlyPage,
    listSort,
    listOnlyMine,
    pendingDeleteId,
    activeThreadId,
    draft,
    author: identity.name,
    attach: attachStore,
    detach: detachStore,
    startDraft,
    addThread,
    movePin,
    reply,
    setResolved,
    deleteThread,
    requestDelete,
    deleteReply,
    focusThread
  }
}
