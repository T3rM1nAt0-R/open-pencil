import { TEXT_METRIC_FIELDS, type SceneGraph, type SceneNode } from '@open-pencil/scene-graph'
import { fitShapeWithText } from '@open-pencil/scene-graph/shape-with-text'

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
  'shapeUserHeight',
  'shapeUserWidth'
])

function measureText(node: SceneNode, maxWidth?: number): { width: number; height: number } {
  return getTextMeasurer()?.(node, maxWidth) ?? estimateTextSize(node, maxWidth)
}

/**
 * A shape with text fits its label as FigJam does (see fitShapeWithText): it keeps the size it was
 * given while the label fits and grows when it does not. A change to the width or height sets the
 * size it was given.
 */
export function shapeWithTextFitChanges(
  node: SceneNode,
  changes: Partial<SceneNode>
): Partial<Pick<SceneNode, 'width' | 'height' | 'shapeUserHeight' | 'shapeUserWidth'>> {
  if (!Object.keys(changes).some((key) => SHAPE_FIT_KEYS.has(key as keyof SceneNode))) return {}
  const next = { ...node, ...changes }
  const givenWidth =
    changes.shapeUserWidth ??
    changes.width ??
    (next.shapeUserWidth > 0 ? next.shapeUserWidth : next.width)
  const givenHeight =
    changes.shapeUserHeight ??
    changes.height ??
    (next.shapeUserHeight > 0 ? next.shapeUserHeight : next.height)
  const label: SceneNode = { ...next, type: 'TEXT', textAutoResize: 'HEIGHT' }
  const words = next.text.split(/\s+/).filter(Boolean)
  const longestWord = Math.max(
    0,
    ...words.map((word) => measureText({ ...label, text: word, styleRuns: [] }).width)
  )
  const size = next.text
    ? fitShapeWithText(next.shapeWithTextType, {
        width: givenWidth,
        height: givenHeight,
        longestWord,
        measure: (maxWidth) => measureText({ ...label, width: maxWidth }, maxWidth)
      })
    : { width: givenWidth, height: givenHeight }
  return { ...size, shapeUserWidth: givenWidth, shapeUserHeight: givenHeight }
}

export function textAutoResizeChanges(
  node: SceneNode | undefined,
  changes: Partial<SceneNode>
): Partial<
  Pick<
    SceneNode,
    | 'width'
    | 'height'
    | 'derivedLayout'
    | 'derivedTextGlyphs'
    | 'shapeUserHeight'
    | 'shapeUserWidth'
  >
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
