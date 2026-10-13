import { DOMParser, type Element } from '@xmldom/xmldom'
import { inflateSync } from 'fflate'
import { isValid, toUint8Array } from 'js-base64'

import type { Vector } from '@open-pencil/scene-graph'

import { parseStyle, type DrawioStyle } from './style'

export interface DrawioGeometry {
  x: number
  y: number
  width: number
  height: number
  /** Waypoints of an edge, in the coordinates of its parent. */
  points: Vector[]
}

export interface DrawioCell {
  id: string
  parent: string | null
  kind: 'vertex' | 'edge'
  /** The label: HTML when the style says `html=1`, plain text otherwise. */
  value: string
  style: DrawioStyle
  geometry: DrawioGeometry
  source: string | null
  target: string | null
  /** Attributes of the wrapping `UserObject` or `object`, such as `tooltip` and `link`. */
  meta: Record<string, string>
}

export interface DrawioPage {
  id: string
  name: string
  cells: DrawioCell[]
}

/** The ids draw.io gives its two root cells: the root itself and the default layer. */
const ROOT_IDS = new Set(['0', '1'])

function parseXML(source: string): Element | null {
  try {
    const parsed = new DOMParser({
      onError: (level, message) => {
        if (level !== 'warning') throw new Error(message)
      }
    }).parseFromString(source, 'text/xml')
    return parsed.documentElement
  } catch {
    return null
  }
}

function childElements(element: Element, name?: string): Element[] {
  const found: Element[] = []
  for (let node = element.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === 1 && (!name || (node as Element).localName === name)) {
      found.push(node as Element)
    }
  }
  return found
}

/** The XML inside a compressed `<diagram>`: Base64, raw deflate, then percent-encoded text. */
function inflateDiagram(text: string): string | null {
  const encoded = text.trim()
  if (!encoded || !isValid(encoded)) return null
  try {
    const inflated = new TextDecoder().decode(inflateSync(toUint8Array(encoded)))
    return decodeURIComponent(inflated)
  } catch {
    return null
  }
}

function number(element: Element, name: string, fallback = 0): number {
  const value = Number.parseFloat(element.getAttribute(name) ?? '')
  return Number.isFinite(value) ? value : fallback
}

function readGeometry(cell: Element): DrawioGeometry {
  const geometry = childElements(cell, 'mxGeometry').at(0)
  if (!geometry) return { x: 0, y: 0, width: 0, height: 0, points: [] }
  const array = childElements(geometry, 'Array').find((e) => e.getAttribute('as') === 'points')
  return {
    x: number(geometry, 'x'),
    y: number(geometry, 'y'),
    width: number(geometry, 'width'),
    height: number(geometry, 'height'),
    points: array
      ? childElements(array, 'mxPoint').map((p) => ({ x: number(p, 'x'), y: number(p, 'y') }))
      : []
  }
}

function readCell(element: Element): DrawioCell | null {
  const wrapped = element.localName === 'UserObject' || element.localName === 'object'
  const cell = wrapped ? childElements(element, 'mxCell').at(0) : element
  if (!cell) return null
  const id = element.getAttribute('id')
  if (!id) return null
  const meta: Record<string, string> = {}
  if (wrapped) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name !== 'id' && attribute.name !== 'label')
        meta[attribute.name] = attribute.value
    }
  }
  const style = parseStyle(cell.getAttribute('style') ?? '')
  const isEdge = cell.getAttribute('edge') === '1'
  if (!isEdge && cell.getAttribute('vertex') !== '1') return null
  return {
    id,
    parent: cell.getAttribute('parent'),
    kind: isEdge ? 'edge' : 'vertex',
    value: (wrapped ? element.getAttribute('label') : cell.getAttribute('value')) ?? '',
    style,
    geometry: readGeometry(cell),
    source: cell.getAttribute('source'),
    target: cell.getAttribute('target'),
    meta
  }
}

function readModel(model: Element): DrawioCell[] {
  const root = childElements(model, 'root').at(0)
  if (!root) return []
  const cells: DrawioCell[] = []
  for (const element of childElements(root)) {
    const cell = readCell(element)
    if (cell && !ROOT_IDS.has(cell.id)) cells.push(cell)
  }
  return cells
}

function readDiagram(diagram: Element, index: number): DrawioPage | null {
  let model = childElements(diagram, 'mxGraphModel').at(0) ?? null
  if (!model) {
    const xml = inflateDiagram(diagram.textContent ?? '')
    const root = xml ? parseXML(xml) : null
    model = root?.localName === 'mxGraphModel' ? root : null
  }
  if (!model) return null
  return {
    id: diagram.getAttribute('id') ?? `page-${index + 1}`,
    name: diagram.getAttribute('name') || `Page ${index + 1}`,
    cells: readModel(model)
  }
}

/** The pages of a draw.io file, whether its diagrams are plain or compressed. */
export function parseDrawioDocument(source: string): DrawioPage[] | null {
  const root = parseXML(source)
  if (!root) return null
  if (root.localName === 'mxGraphModel') {
    return [{ id: 'page-1', name: 'Page 1', cells: readModel(root) }]
  }
  if (root.localName !== 'mxfile') return null
  const pages = childElements(root, 'diagram')
    .map(readDiagram)
    .filter((page): page is DrawioPage => page !== null)
  return pages.length > 0 ? pages : null
}
