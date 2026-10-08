import type { CommentReply, CommentThread, CommentsFile } from './types'

function mergeReplies(first: CommentReply[], second: CommentReply[]): CommentReply[] {
  const byId = new Map<string, CommentReply>()
  for (const reply of [...first, ...second]) {
    const existing = byId.get(reply.id)
    // A deletion is never undone by an older copy of the same reply.
    byId.set(
      reply.id,
      existing ? { ...existing, ...reply, deleted: existing.deleted || reply.deleted } : reply
    )
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * Two copies of the same comments file (this tab's and the shelf's) become one.
 * Nothing is lost: threads and replies are joined by id, and for a thread both
 * copies changed, the newer edit wins while replies from both are kept.
 */
export function mergeThreads(local: CommentThread[], remote: CommentThread[]): CommentThread[] {
  const byId = new Map<string, CommentThread>()
  for (const thread of remote) byId.set(thread.id, thread)
  for (const thread of local) {
    const other = byId.get(thread.id)
    if (!other) {
      byId.set(thread.id, thread)
      continue
    }
    const newer = thread.updatedAt >= other.updatedAt ? thread : other
    byId.set(thread.id, {
      ...newer,
      deleted: thread.deleted || other.deleted,
      replies: mergeReplies(other.replies, thread.replies)
    })
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function parseCommentsFile(bytes: Uint8Array | null): CommentThread[] {
  if (!bytes || bytes.byteLength === 0) return []
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CommentsFile>
    if (!Array.isArray(parsed.threads)) return []
    return parsed.threads
      .filter(
        (thread): thread is CommentThread =>
          !!thread && typeof thread.id === 'string' && typeof thread.pageId === 'string'
      )
      .map((thread) => ({
        ...thread,
        x: Number(thread.x) || 0,
        y: Number(thread.y) || 0,
        text: String(thread.text ?? ''),
        author: String(thread.author ?? ''),
        resolved: !!thread.resolved,
        updatedAt: thread.updatedAt || thread.createdAt || new Date(0).toISOString(),
        replies: Array.isArray(thread.replies) ? thread.replies : []
      }))
  } catch {
    return []
  }
}
