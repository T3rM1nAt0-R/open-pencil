import * as v from 'valibot'

import type { CommentReply, CommentThread } from './types'

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

// Lenient on purpose: people and tools edit the file by hand, so missing fields get defaults
// and one malformed thread is skipped instead of hiding every comment.
const replySchema = v.object({
  id: v.string(),
  author: v.fallback(v.string(), ''),
  text: v.fallback(v.string(), ''),
  createdAt: v.fallback(v.string(), ''),
  deleted: v.optional(v.boolean())
})

const threadSchema = v.object({
  id: v.string(),
  pageId: v.string(),
  pageName: v.optional(v.string()),
  nodeId: v.optional(v.nullable(v.string())),
  nodeName: v.optional(v.nullable(v.string())),
  offsetX: v.optional(v.number()),
  offsetY: v.optional(v.number()),
  x: v.fallback(v.number(), 0),
  y: v.fallback(v.number(), 0),
  author: v.fallback(v.string(), ''),
  text: v.fallback(v.string(), ''),
  createdAt: v.fallback(v.string(), ''),
  updatedAt: v.fallback(v.string(), ''),
  resolved: v.fallback(v.boolean(), false),
  resolvedAt: v.optional(v.nullable(v.string())),
  deleted: v.optional(v.boolean()),
  replies: v.fallback(v.array(replySchema), [])
})

const commentsFileSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({ threads: v.array(v.unknown()) })
)

export function parseCommentsFile(bytes: Uint8Array | null): CommentThread[] {
  if (!bytes || bytes.byteLength === 0) return []
  const file = v.safeParse(commentsFileSchema, new TextDecoder().decode(bytes))
  if (!file.success) return []
  const threads: CommentThread[] = []
  for (const entry of file.output.threads) {
    const parsed = v.safeParse(threadSchema, entry)
    if (!parsed.success) continue
    const thread = parsed.output
    threads.push({
      ...thread,
      updatedAt: thread.updatedAt || thread.createdAt || new Date(0).toISOString()
    })
  }
  return threads
}
