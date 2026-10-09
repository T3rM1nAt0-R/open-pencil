import {
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withPluginData,
  type CommentThread,
  type SceneGraph
} from '@open-pencil/scene-graph'

const { comments } = OPEN_PENCIL_PLUGIN_DATA

/**
 * Comments are part of the document: they live in OpenPencil's plugin data on the document
 * node, so they travel with the `.fig` file, its storage copy and a collaboration room, and
 * Figma or an older OpenPencil open the file as before.
 */
export function readDocumentComments(graph: SceneGraph): CommentThread[] {
  return readPluginData(graph.getNode(graph.rootId)?.pluginData, comments) ?? []
}

/**
 * Stores the threads on the document node. This is a document change, so the document asks to
 * be saved, but not an undo step: undoing a layer edit never takes back a comment.
 */
export function writeDocumentComments(graph: SceneGraph, threads: CommentThread[]): void {
  const root = graph.getNode(graph.rootId)
  if (!root) return
  graph.updateNode(root.id, {
    pluginData: withPluginData(root.pluginData, comments, threads.length > 0 ? threads : undefined)
  })
}
