import type { Color, SceneNode } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'
import { ensureGraphFonts } from '@/app/editor/fonts'

/**
 * Build-status stamps for screens: the same tag a wireframe script might draw
 * (a small rounded "Status" box under the screen's "Label: <name>" title), placed in one click.
 */
export const STAMP_STATUSES = ['Built', 'Being built', 'Planned'] as const
export type StampStatus = (typeof STAMP_STATUSES)[number]

const STAMP_STYLE: Record<StampStatus, { fill: Color; width: number }> = {
  Built: { fill: { r: 0.84, g: 0.91, b: 0.83, a: 1 }, width: 60 },
  'Being built': { fill: { r: 1, g: 0.95, b: 0.8, a: 1 }, width: 96 },
  Planned: { fill: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, width: 76 }
}
const STAMP_BORDER: Color = { r: 0.88, g: 0.88, b: 0.88, a: 1 }
const STAMP_INK: Color = { r: 0.13, g: 0.13, b: 0.13, a: 1 }
const STAMP_NAME = 'Status'
const STAMP_HEIGHT = 24
const STAMP_TEXT_SIZE = 12
const HELPER_LAYER = /^(Label|Note|Status): /

/** The page-level layer a selected layer belongs to: that is the "screen". */
function screenOf(store: EditorStore, id: string, pageId: string): SceneNode | null {
  let node = store.graph.getNode(id)
  while (node?.parentId && node.parentId !== pageId) node = store.graph.getNode(node.parentId)
  return node?.parentId === pageId ? node : null
}

function childNamed(store: EditorStore, parentId: string, name: string): SceneNode | null {
  for (const id of store.graph.getNode(parentId)?.childIds ?? []) {
    const child = store.graph.getNode(id)
    if (child?.name === name) return child
  }
  return null
}

/** Where a screen's stamp lives: inside its "Label: <name>" title, or a "Status: <name>" tag above it. */
function stampHome(store: EditorStore, screen: SceneNode, pageId: string) {
  const label = childNamed(store, pageId, `Label: ${screen.name}`)
  if (label) return { parentId: label.id, name: STAMP_NAME, x: 0, y: 30 }
  return {
    parentId: pageId,
    name: `${STAMP_NAME}: ${screen.name}`,
    x: screen.x,
    y: screen.y - STAMP_HEIGHT - 10
  }
}

function stampScreen(
  store: EditorStore,
  screen: SceneNode,
  pageId: string,
  status: StampStatus | null
) {
  const home = stampHome(store, screen, pageId)
  const existing = childNamed(store, home.parentId, home.name)
  if (!status) {
    if (existing) store.graph.deleteNode(existing.id)
    return
  }
  const style = STAMP_STYLE[status]
  const tagFill = [{ type: 'SOLID' as const, color: style.fill, opacity: 1, visible: true }]
  const tag =
    existing ??
    store.graph.createNode('FRAME', home.parentId, {
      name: home.name,
      x: home.x,
      y: home.y,
      cornerRadius: 8,
      strokes: [{ color: STAMP_BORDER, weight: 1.5, opacity: 1, visible: true, align: 'INSIDE' }]
    })
  store.graph.updateNode(tag.id, { width: style.width, height: STAMP_HEIGHT, fills: tagFill })
  const textChanges: Partial<SceneNode> = {
    name: status,
    text: status,
    fontSize: STAMP_TEXT_SIZE,
    textAlignHorizontal: 'CENTER',
    textAutoResize: 'HEIGHT',
    x: 0,
    y: 4,
    width: style.width,
    height: Math.ceil(STAMP_TEXT_SIZE * 1.35),
    fills: [{ type: 'SOLID', color: STAMP_INK, opacity: 1, visible: true }]
  }
  const label = tag.childIds
    .map((id) => store.graph.getNode(id))
    .find((child) => child?.type === 'TEXT')
  if (label) store.graph.updateNode(label.id, textChanges)
  else store.graph.createNode('TEXT', tag.id, textChanges)
}

/** The screens a stamp would go on: the selected layers' page-level layers, helpers left out. */
export function stampTargets(store: EditorStore): SceneNode[] {
  const pageId = store.state.currentPageId
  const byId = new Map<string, SceneNode>()
  for (const id of store.state.selectedIds) {
    const screen = screenOf(store, id, pageId)
    if (screen && !HELPER_LAYER.test(screen.name)) byId.set(screen.id, screen)
  }
  return [...byId.values()]
}

/** Stamp (or clear, with null) every selected screen as one undoable step. */
export async function applyStamp(store: EditorStore, status: StampStatus | null): Promise<number> {
  const pageId = store.state.currentPageId
  const screens = stampTargets(store)
  if (screens.length === 0) return 0
  const before = store.snapshotPage()
  await store.runMutationWithLayout(
    () => {
      for (const screen of screens) stampScreen(store, screen, pageId, status)
    },
    pageId,
    async () => {
      const page = store.graph.getNode(pageId)
      if (page) await ensureGraphFonts(store.graph, page.childIds, store.renderer)
    }
  )
  store.requestRender()
  const after = store.snapshotPage()
  store.pushUndoEntry({
    label: status ? `Stamp ${status}` : 'Remove stamp',
    forward: () => store.restorePageFromSnapshot(after),
    inverse: () => store.restorePageFromSnapshot(before)
  })
  return screens.length
}
