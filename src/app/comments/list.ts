import type { CommentThread } from '@open-pencil/scene-graph'

export type CommentsTab = 'open' | 'resolved'
export type CommentsScope = 'page' | 'all'
export type CommentsSort = 'newest' | 'oldest'

export interface CommentsListOptions {
  tab: CommentsTab
  query: string
  scope: CommentsScope
  pageId: string
  onlyMine: boolean
  author: string
  sort: CommentsSort
}

function matches(thread: CommentThread, query: string): boolean {
  const words = [thread.text, thread.author, thread.nodeName ?? '', thread.pageName ?? '']
  for (const entry of thread.replies) if (!entry.deleted) words.push(entry.text, entry.author)
  return words.some((word) => word.toLocaleLowerCase().includes(query))
}

function lastActivity(thread: CommentThread): string {
  return thread.updatedAt || thread.createdAt
}

/** The threads the comments list shows for its current tab, search, filters and order. */
export function listThreads(
  threads: readonly CommentThread[],
  options: CommentsListOptions
): CommentThread[] {
  const query = options.query.trim().toLocaleLowerCase()
  const author = options.author.trim()
  const listed = threads.filter(
    (thread) =>
      !thread.deleted &&
      thread.resolved === (options.tab === 'resolved') &&
      (options.scope === 'all' || thread.pageId === options.pageId) &&
      (!options.onlyMine || (author !== '' && thread.author === author)) &&
      (query === '' || matches(thread, query))
  )
  const direction = options.sort === 'newest' ? -1 : 1
  return listed.sort((a, b) => direction * lastActivity(a).localeCompare(lastActivity(b)))
}
