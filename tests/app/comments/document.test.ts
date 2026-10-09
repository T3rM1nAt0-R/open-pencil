import { describe, expect, test } from 'bun:test'

import { exportFigFile, initCodec, parseFigFile } from '@open-pencil/core'
import { SceneGraph, type CommentThread } from '@open-pencil/scene-graph'

import { readDocumentComments, writeDocumentComments } from '@/app/comments/document'

function thread(id: string, patch: Partial<CommentThread> = {}): CommentThread {
  return {
    id,
    pageId: '0:1',
    x: 10,
    y: 20,
    author: 'Ada',
    text: id,
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
    resolved: false,
    replies: [],
    ...patch
  }
}

describe('document comments', () => {
  test('survive saving the .fig file and opening it again', async () => {
    await initCodec()
    const graph = new SceneGraph()
    const saved = [
      thread('a', {
        replies: [{ id: 'r', author: 'Grace', text: 'Done', createdAt: '2026-10-08T11:00:00.000Z' }]
      }),
      thread('b', { resolved: true, resolvedAt: '2026-10-08T12:00:00.000Z' }),
      thread('c', { deleted: true })
    ]
    writeDocumentComments(graph, saved)
    const reopened = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
    expect(readDocumentComments(reopened)).toEqual(saved)
  })

  test('skip malformed threads and read damaged data as no comments', () => {
    const graph = new SceneGraph()
    const root = graph.getNode(graph.rootId)
    if (!root) throw new Error('Root missing')
    const store = (value: string) =>
      graph.updateNode(root.id, {
        pluginData: [{ pluginId: 'open-pencil', key: 'comments', value }]
      })

    store('not json')
    expect(readDocumentComments(graph)).toEqual([])
    store(JSON.stringify([thread('a'), { id: 3 }, 'b']))
    expect(readDocumentComments(graph).map((entry) => entry.id)).toEqual(['a'])
  })

  test('removing every thread leaves no entry behind', () => {
    const graph = new SceneGraph()
    writeDocumentComments(graph, [thread('a')])
    writeDocumentComments(graph, [])
    expect(graph.getNode(graph.rootId)?.pluginData).toEqual([])
  })
})
