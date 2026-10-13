export { buildDrawioGraph } from './build'
export { parseDrawioDocument } from './document'

import type { SceneGraph } from '@open-pencil/scene-graph'

import { buildDrawioGraph } from './build'
import { parseDrawioDocument } from './document'

/** A draw.io file as a document, or null when it holds no draw.io diagram. */
export function readDrawioDocument(source: string): SceneGraph | null {
  const pages = parseDrawioDocument(source)
  return pages ? buildDrawioGraph(pages) : null
}
