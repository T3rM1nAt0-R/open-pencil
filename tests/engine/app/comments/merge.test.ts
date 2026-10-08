import { describe, expect, test } from 'bun:test'

import { mergeThreads, parseCommentsFile } from '@/app/comments/merge'
import type { CommentThread } from '@/app/comments/types'

function thread(id: string, patch: Partial<CommentThread> = {}): CommentThread {
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
    replies: [],
    ...patch
  }
}

describe('comments merge', () => {
  test('keeps threads added on either side', () => {
    const merged = mergeThreads([thread('a')], [thread('b')])
    expect(merged.map((entry) => entry.id).sort()).toEqual(['a', 'b'])
  })

  test('newer edit wins and replies from both sides stay', () => {
    const reply = (id: string) => ({
      id,
      author: 'x',
      text: id,
      createdAt: `2026-10-08T11:0${id}:00.000Z`
    })
    const local = thread('a', {
      resolved: true,
      updatedAt: '2026-10-08T12:00:00.000Z',
      replies: [reply('1')]
    })
    const remote = thread('a', { updatedAt: '2026-10-08T11:00:00.000Z', replies: [reply('2')] })
    const [merged] = mergeThreads([local], [remote])
    expect(merged.resolved).toBe(true)
    expect(merged.replies.map((entry) => entry.id)).toEqual(['1', '2'])
  })

  test('a deletion is not undone by an older copy', () => {
    const local = thread('a', { deleted: true, updatedAt: '2026-10-08T09:00:00.000Z' })
    const [merged] = mergeThreads([local], [thread('a')])
    expect(merged.deleted).toBe(true)
  })

  test('reads damaged or empty files as no comments', () => {
    expect(parseCommentsFile(null)).toEqual([])
    expect(parseCommentsFile(new TextEncoder().encode('not json'))).toEqual([])
    const file = new TextEncoder().encode(JSON.stringify({ threads: [thread('a'), { id: 3 }] }))
    expect(parseCommentsFile(file).map((entry) => entry.id)).toEqual(['a'])
  })
})
