/**
 * Comments live beside a design, never inside the .fig file, so stock OpenPencil
 * opens the same file unchanged. Shelf documents keep them in
 * `canvases/<id>.comments.json` next to `<id>.fig`; other documents keep them in
 * this browser only. The JSON is plain on purpose: people and tools can read it.
 */
export const COMMENTS_FILE_VERSION = 1

export type CommentReply = {
  id: string
  author: string
  text: string
  createdAt: string
  deleted?: boolean
}

export type CommentThread = {
  id: string
  pageId: string
  /** Page name when the pin was placed, for readers of the JSON. */
  pageName?: string
  /** Top-level layer under the pin; the pin follows it when it moves. */
  nodeId?: string | null
  nodeName?: string | null
  /** Offset from the layer's top-left corner, in canvas units. */
  offsetX?: number
  offsetY?: number
  /** Canvas position when the pin was last saved; used when the layer is gone. */
  x: number
  y: number
  author: string
  text: string
  createdAt: string
  /** Bumped on every change; the newer copy wins when two saves meet. */
  updatedAt: string
  resolved: boolean
  resolvedAt?: string | null
  deleted?: boolean
  replies: CommentReply[]
}

export type CommentsFile = {
  version: number
  documentId: string
  documentName?: string
  threads: CommentThread[]
}
