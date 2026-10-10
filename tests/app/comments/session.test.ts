import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { ALL_TOOLS } from '@open-pencil/core/tools'
import { readComments, type CommentThread } from '@open-pencil/scene-graph'

import { executeWithPageUndo } from '@/app/automation/execution/editor'
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

  expect(ids(readComments(first.graph))).toEqual(['mine'])
  expect(ids(readComments(second.graph))).toEqual(['other'])
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

  const [detached] = readComments(store.graph)
  expect(detached?.nodeId).toBeNull()
  expect(detached && pinPosition(store, detached)).toEqual({ x: 310, y: 55 })
})

test('a collaborator’s save that lacks this session’s comment does not lose it', async () => {
  const store = createEditorStore()
  attachStore(store)
  mutate((current) => [...current, thread('mine')])
  const root = store.graph.getNode(store.graph.rootId)
  if (!root) throw new Error('Root missing')

  // Their copy was written before ours arrived, so it replaces the list whole.
  store.graph.updateNode(root.id, {
    pluginData: [
      { pluginId: 'open-pencil', key: 'comments', value: JSON.stringify([thread('theirs')]) }
    ]
  })
  await Promise.resolve()

  expect(ids(readComments(store.graph)).toSorted()).toEqual(['mine', 'theirs'])
  expect(ids(threads.value).toSorted()).toEqual(['mine', 'theirs'])
})

test('an agent’s comment is not an undo step either, as comments stay out of undo', async () => {
  const store = createEditorStore()
  attachStore(store)
  const canUndo = store.undo.canUndo
  const figma = new FigmaAPI(store.graph)
  const addComment = ALL_TOOLS.find((tool) => tool.name === 'add_comment')
  if (!addComment) throw new Error('add_comment missing')

  await executeWithPageUndo(store, store.state.currentPageId, 'Agent: add_comment', () =>
    Promise.resolve(addComment.execute(figma, { text: 'Tighten the spacing', x: 4, y: 4 }))
  )
  await Promise.resolve()

  expect(ids(threads.value)).toHaveLength(1)
  expect(store.undo.canUndo).toBe(canUndo)
})
