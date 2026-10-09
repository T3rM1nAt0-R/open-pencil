import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import type { CommentThread } from '@open-pencil/scene-graph'

import { readDocumentComments } from '@/app/comments/document'
import { attachStore, detachStore, mutate, pinPosition, threads } from '@/app/comments/session'
import { createEditorStore } from '@/app/editor/session/create'

function thread(id: string): CommentThread {
  return {
    id,
    pageId: '0:1',
    x: 0,
    y: 0,
    author: 'Ada',
    text: id,
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
    resolved: false,
    replies: []
  }
}

const ids = (list: CommentThread[]) => list.map((entry) => entry.id)

afterEach(() => {
  detachStore()
})

test('a comment lands in the document it was written in, not the next one opened', () => {
  const first = createEditorStore()
  const second = createEditorStore()

  attachStore(first)
  mutate((current) => [...current, thread('mine')])
  detachStore()
  attachStore(second)
  expect(threads.value).toEqual([])
  mutate((current) => [...current, thread('other')])

  expect(ids(readDocumentComments(first.graph))).toEqual(['mine'])
  expect(ids(readDocumentComments(second.graph))).toEqual(['other'])
})

test('commenting marks the document changed without adding an undo step', () => {
  const store = createEditorStore()
  store.markDocumentSaved()
  const canUndo = store.undo.canUndo
  attachStore(store)

  mutate((current) => [...current, thread('a')])

  expect(store.hasUnsavedChanges()).toBe(true)
  expect(store.undo.canUndo).toBe(canUndo)
})

test('comments written to the document from elsewhere show up', async () => {
  const store = createEditorStore()
  attachStore(store)
  const root = store.graph.getNode(store.graph.rootId)
  if (!root) throw new Error('Root missing')

  store.graph.updateNode(root.id, {
    pluginData: [{ pluginId: 'open-pencil', key: 'comments', value: JSON.stringify([thread('x')]) }]
  })
  await Promise.resolve()

  expect(ids(threads.value)).toEqual(['x'])
})

test('a pin stays where its layer was when the layer is deleted', async () => {
  const store = createEditorStore()
  attachStore(store)
  const pageId = store.state.currentPageId
  const rect = store.graph.createNode('RECTANGLE', pageId, { x: 100, y: 50, width: 80, height: 40 })
  const pinned = { ...thread('p'), pageId, nodeId: rect.id, offsetX: 10, offsetY: 5 }
  mutate((current) => [...current, pinned])

  store.graph.updateNode(rect.id, { x: 300 })
  expect(pinPosition(store, pinned)).toEqual({ x: 310, y: 55 })
  store.graph.deleteNode(rect.id)
  await Promise.resolve()

  const [detached] = readDocumentComments(store.graph)
  expect(detached?.nodeId).toBeNull()
  expect(detached && pinPosition(store, detached)).toEqual({ x: 310, y: 55 })
})
