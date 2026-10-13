import type { CanvasKit } from 'canvaskit-wasm'

import { SkiaRenderer } from '@open-pencil/core/canvas'
import { getCanvasKit } from '@open-pencil/core/canvaskit'
import { findFigThumbnailPageId } from '@open-pencil/core/io/formats/fig'
import { renderThumbnail } from '@open-pencil/core/io/formats/raster'
import type { SceneGraph } from '@open-pencil/scene-graph'

/** Longest side, in pixels, of a design preview. */
export const DOCUMENT_PREVIEW_SIZE = 512

let offscreen: Promise<{ ck: CanvasKit; renderer: SkiaRenderer }> | null = null

/** A renderer that is never shown, so previews can be drawn without opening a design. */
function offscreenRenderer(): Promise<{ ck: CanvasKit; renderer: SkiaRenderer }> {
  offscreen ??= (async () => {
    const ck = await getCanvasKit()
    const surface = ck.MakeSurface(1, 1)
    if (!surface) throw new Error('Could not create a surface to draw previews')
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 1
    renderer.viewportHeight = 1
    renderer.dpr = 1
    await renderer.loadFonts()
    return { ck, renderer }
  })().catch((error: unknown) => {
    offscreen = null
    throw error
  })
  return offscreen
}

/** The page a preview shows: the cover when the design has one, otherwise the first page. */
export function documentPreviewPageId(graph: SceneGraph): string | null {
  const pages = graph.getPages()
  return findFigThumbnailPageId(pages) ?? pages.at(0)?.id ?? null
}

/** Draws a PNG preview of a design that is not open in any tab. */
export async function renderOffscreenPreview(graph: SceneGraph): Promise<Uint8Array | null> {
  const pageId = documentPreviewPageId(graph)
  const page = pageId ? graph.getNode(pageId) : undefined
  if (!pageId || !page) return null
  const { ck, renderer } = await offscreenRenderer()
  renderer.invalidateAllPictures()
  await renderer.prepareForExport(graph, pageId, [...page.childIds])
  return renderThumbnail(ck, renderer, graph, pageId, DOCUMENT_PREVIEW_SIZE, DOCUMENT_PREVIEW_SIZE)
}
