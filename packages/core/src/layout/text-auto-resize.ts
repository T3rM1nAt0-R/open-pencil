import { TEXT_METRIC_FIELDS, type SceneGraph, type SceneNode } from '@open-pencil/scene-graph'
import {
  shapeWithTextHeightFor,
  shapeWithTextLabelBox
} from '@open-pencil/scene-graph/shape-with-text'

import { estimateTextSize, getTextMeasurer } from './text-measurement'

export const TEXT_AUTO_RESIZE_KEYS = new Set<keyof SceneNode>([
  ...TEXT_METRIC_FIELDS,
  'lineHeight',
  'textAutoResize',
  'width',
  'maxLines'
])

const TEXT_AUTO_WIDTH_KEYS = new Set<keyof SceneNode>([...TEXT_METRIC_FIELDS, 'textAutoResize'])

export function hasTextAutoResizeChange(changes: Partial<SceneNode>): boolean {
  return Object.keys(changes).some((key) => TEXT_AUTO_RESIZE_KEYS.has(key as keyof SceneNode))
}

function hasTextAutoWidthChange(changes: Partial<SceneNode>): boolean {
  return Object.keys(changes).some((key) => TEXT_AUTO_WIDTH_KEYS.has(key as keyof SceneNode))
}

const SHAPE_FIT_KEYS = new Set<keyof SceneNode>([
  ...TEXT_METRIC_FIELDS,
  'lineHeight',
  'width',
  'height',
  'shapeWithTextType',
  'shapeUserHeight'
])

/**
 * A shape with text grows taller to fit its label and goes back to the height it was given once
 * the label fits again, as FigJam does. A change to the height sets the height it was given.
 */
export function shapeWithTextFitChanges(
  node: SceneNode,
  changes: Partial<SceneNode>
): Partial<Pick<SceneNode, 'height' | 'shapeUserHeight'>> {
  if (!Object.keys(changes).some((key) => SHAPE_FIT_KEYS.has(key as keyof SceneNode))) return {}
  const next = { ...node, ...changes }
  const given =
    changes.shapeUserHeight ??
    changes.height ??
    (next.shapeUserHeight > 0 ? next.shapeUserHeight : next.height)
  const box = shapeWithTextLabelBox(next.shapeWithTextType, next.width, given)
  const label: SceneNode = { ...next, type: 'TEXT', width: box.width, textAutoResize: 'HEIGHT' }
  const measured = next.text
    ? (getTextMeasurer()?.(label, box.width) ?? estimateTextSize(label, box.width))
    : { height: 0 }
  const needed = shapeWithTextHeightFor(next.shapeWithTextType, measured.height)
  return { height: Math.max(given, needed), shapeUserHeight: given }
}

export function textAutoResizeChanges(
  node: SceneNode | undefined,
  changes: Partial<SceneNode>
): Partial<
  Pick<SceneNode, 'width' | 'height' | 'derivedLayout' | 'derivedTextGlyphs' | 'shapeUserHeight'>
> {
  if (node?.type === 'SHAPE_WITH_TEXT') return shapeWithTextFitChanges(node, changes)
  if (node?.type !== 'TEXT' || !hasTextAutoResizeChange(changes)) return {}
  // Path text is laid out along its path (derivedTextGlyphs on textPathBox),
  // not by paragraph auto-resize. Running the measurement here would null the
  // derived glyphs — destroying the on-path lettering — whenever an imported
  // TEXT_PATH carries textAutoResize HEIGHT/WIDTH_AND_HEIGHT and a keystroke
  // can't reflow (font outlines or the layout path unavailable). pathTextEditChanges
  // owns path-text reflow; leave its glyphs alone.
  if (node.textPathData) return {}

  const next = { ...node, ...changes }
  const mode = next.textAutoResize
  if (mode !== 'HEIGHT' && mode !== 'WIDTH_AND_HEIGHT') return {}

  const maxWidth = mode === 'HEIGHT' ? next.width : undefined
  const measured = getTextMeasurer()?.(next, maxWidth) ?? estimateTextSize(next, maxWidth)
  const resized: Partial<
    Pick<SceneNode, 'width' | 'height' | 'derivedLayout' | 'derivedTextGlyphs'>
  > = { derivedLayout: null, derivedTextGlyphs: null }

  if (mode === 'WIDTH_AND_HEIGHT' && hasTextAutoWidthChange(changes) && measured.width > 0)
    resized.width = measured.width
  if (measured.height > 0) resized.height = measured.height

  return resized
}

/**
 * Measures the text under `rootId` that resizes to its content; `wrappingOnly` measures only text
 * that wraps, at the width it has now. Auto layout measures the text it holds when it lays out;
 * text anywhere else keeps the size it was created with otherwise. Reports whether a size changed.
 */
export function sizeAutoResizingText(
  graph: SceneGraph,
  rootId: string,
  wrappingOnly = false
): boolean {
  let changed = false
  const stack = [rootId]
  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    const node = graph.getNode(id)
    if (!node) continue
    stack.push(...node.childIds)
    if (node.type !== 'TEXT' || (wrappingOnly && node.textAutoResize !== 'HEIGHT')) continue
    // Wrapping text the source gave no width wraps at the width its content takes.
    const unsized = node.textAutoResize === 'HEIGHT' && node.width <= 0
    const changes = textAutoResizeChanges(node, {
      textAutoResize: unsized ? 'WIDTH_AND_HEIGHT' : node.textAutoResize
    })
    const resized =
      (changes.width !== undefined && changes.width !== node.width) ||
      (changes.height !== undefined && changes.height !== node.height)
    if (!resized) continue
    graph.updateNode(id, changes)
    changed = true
  }
  return changed
}
