import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'

import { attachStore, detachStore, mutate, refresh } from '@/app/comments/session'
import { browserCommentsBackend } from '@/app/comments/storage'
import type { CommentThread } from '@/app/comments/types'
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

test('a comment saves to its own document when another opens before the write', async () => {
  const first = createEditorStore()
  const second = createEditorStore()
  const firstComments = browserCommentsBackend(`recovery:${first.getRecoveryId()}`)
  const secondComments = browserCommentsBackend(`recovery:${second.getRecoveryId()}`)
  await secondComments.save([thread('other')], 'Other')

  attachStore(first)
  await refresh()
  mutate((current) => [...current, thread('mine')])
  attachStore(second)
  await refresh()
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })

  expect((await firstComments.load()).map((t) => t.id)).toEqual(['mine'])
  expect((await secondComments.load()).map((t) => t.id)).toEqual(['other'])
  detachStore()
  detachStore()
})
