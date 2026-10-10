import {
  commentAnchor,
  createCommentReply,
  createCommentThread,
  deleteReply as deleteCommentReply,
  deleteThread as deleteCommentThread,
  replyToThread,
  resolveThread
} from '@open-pencil/scene-graph'
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
  now,
  mutate,
  updateThread,
  pinPosition,
  activeStore,
  attachStore,
  detachStore
} from './session'

export { pinPosition } from './session'

export function useComments() {
  const identity = useCollabIdentity()
  const me = () => ({ name: identity.name.value, color: identity.color })

  /** A dragged pin lands on whatever is under it now, as in Figma. */
  function movePin(threadId: string, at: Vector) {
    const store = activeStore()
    if (!store) return
    updateThread(threadId, (thread) => ({
      ...thread,
      ...commentAnchor(store.graph, thread.pageId, at)
    }))
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
    const thread = createCommentThread(store.graph, {
      pageId: place.pageId,
      at: place,
      author: me(),
      text: body,
      now: now()
    })
    draft.value = null
    activeThreadId.value = thread.id
    mutate((current) => [...current, thread])
  }

  function reply(threadId: string, text: string) {
    const body = text.trim()
    if (!body) return
    const entry = createCommentReply(me(), body, now())
    updateThread(threadId, (thread) => replyToThread(thread, entry))
  }

  function setResolved(threadId: string, resolved: boolean) {
    updateThread(threadId, (thread) => resolveThread(thread, resolved, now()))
    // A resolved thread leaves the canvas unless resolved comments are shown.
    if (resolved && !listShowResolved.value && activeThreadId.value === threadId) {
      activeThreadId.value = null
    }
  }

  function deleteThread(threadId: string) {
    updateThread(threadId, deleteCommentThread)
    if (activeThreadId.value === threadId) activeThreadId.value = null
  }

  /** Ask before deleting; the comments layer shows the confirmation. */
  function requestDelete(threadId: string) {
    pendingDeleteId.value = threadId
  }

  function deleteReply(threadId: string, replyId: string) {
    updateThread(threadId, (thread) => deleteCommentReply(thread, replyId))
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
