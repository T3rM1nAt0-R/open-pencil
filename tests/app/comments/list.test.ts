import { describe, expect, test } from 'bun:test'

import { listThreads, type CommentsListOptions } from '@/app/comments/list'
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

const base: CommentsListOptions = {
  tab: 'open',
  query: '',
  scope: 'all',
  pageId: '0:1',
  onlyMine: false,
  author: 'Ada',
  sort: 'newest'
}

const ids = (threads: CommentThread[]) => threads.map((entry) => entry.id)

describe('comments list', () => {
  test('splits open and resolved and drops deleted threads', () => {
    const threads = [thread('a'), thread('b', { resolved: true }), thread('c', { deleted: true })]
    expect(ids(listThreads(threads, base))).toEqual(['a'])
    expect(ids(listThreads(threads, { ...base, tab: 'resolved' }))).toEqual(['b'])
  })

  test('searches text, authors and replies', () => {
    const threads = [
      thread('a', { text: 'Bigger button' }),
      thread('b', {
        replies: [{ id: 'r', author: 'Claude', text: 'Moved the logo', createdAt: '' }]
      })
    ]
    expect(ids(listThreads(threads, { ...base, query: 'button' }))).toEqual(['a'])
    expect(ids(listThreads(threads, { ...base, query: 'LOGO' }))).toEqual(['b'])
  })

  test('filters to this page and to my comments', () => {
    const threads = [thread('a'), thread('b', { pageId: '0:2', author: 'Claude' })]
    expect(ids(listThreads(threads, { ...base, scope: 'page' }))).toEqual(['a'])
    expect(ids(listThreads(threads, { ...base, onlyMine: true }))).toEqual(['a'])
  })

  test('sorts by latest activity', () => {
    const threads = [
      thread('old', { updatedAt: '2026-10-07T10:00:00.000Z' }),
      thread('new', { updatedAt: '2026-10-08T12:00:00.000Z' })
    ]
    expect(ids(listThreads(threads, base))).toEqual(['new', 'old'])
    expect(ids(listThreads(threads, { ...base, sort: 'oldest' }))).toEqual(['old', 'new'])
  })
})
