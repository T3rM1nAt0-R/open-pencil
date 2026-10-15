/// <reference types="@figma/plugin-typings" />

import type { Fill, SceneNode } from '@open-pencil/scene-graph'
import {
  isShapeWithTextType,
  type ShapeWithTextType
} from '@open-pencil/scene-graph/shape-with-text'

import { BLACK as BLACK_COLOR } from '#core/constants'

import type { FigmaPaint } from './accessors/visual'
import type { FigmaNodeProxy } from './proxy'

type LabelHost = Pick<FigmaNodeProxy, 'characters' | 'getRangeFills' | 'setRangeFills'>

/** Properties Figma's `TextSublayerNode` shares with a text node, read and written on the shape. */
const PASSED_PROPERTIES = [
  'characters',
  'fontSize',
  'fontName',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'textCase',
  'textDecoration',
  'paragraphIndent',
  'paragraphSpacing',
  'listSpacing',
  'hangingPunctuation',
  'hangingList',
  'hyperlink',
  'hasMissingFont'
] as const

/** Methods Figma's `TextSublayerNode` shares with a text node, called on the shape. */
const PASSED_METHODS = [
  'insertCharacters',
  'deleteCharacters',
  'getStyledTextSegments',
  'getRangeFontSize',
  'setRangeFontSize',
  'getRangeFontName',
  'setRangeFontName',
  'getRangeFontWeight',
  'getRangeAllFontNames',
  'getRangeFills',
  'setRangeFills',
  'getRangeTextCase',
  'setRangeTextCase',
  'getRangeTextDecoration',
  'setRangeTextDecoration',
  'getRangeLetterSpacing',
  'setRangeLetterSpacing',
  'getRangeLineHeight',
  'setRangeLineHeight',
  'getRangeHyperlink',
  'setRangeHyperlink',
  'getRangeListOptions',
  'setRangeListOptions',
  'getRangeIndentation',
  'setRangeIndentation'
] as const

const BLACK: Fill = { type: 'SOLID', color: BLACK_COLOR, opacity: 1, visible: true }

/**
 * A shape with text's label, as Figma's plugin API gives it (`ShapeWithTextNode.text`). The label
 * is the shape's own text, so every member reads and writes the shape; only `fills` differs: a
 * shape's fills paint the shape, and the label's fills paint all of its characters.
 */
export class ShapeWithTextLabel {
  readonly #host: LabelHost

  constructor(host: LabelHost) {
    this.#host = host
    for (const name of PASSED_PROPERTIES) {
      Object.defineProperty(this, name, {
        enumerable: true,
        get: (): unknown => Reflect.get(host, name),
        set: (value: unknown) => {
          Reflect.set(host, name, value)
        }
      })
    }
    for (const name of PASSED_METHODS) {
      const method: unknown = Reflect.get(host, name)
      if (typeof method === 'function') {
        Object.defineProperty(this, name, { value: method.bind(host) })
      }
    }
  }

  get fills(): ReturnType<LabelHost['getRangeFills']> {
    const length = this.#host.characters.length
    if (length === 0) return [BLACK]
    return this.#host.getRangeFills(0, length)
  }

  set fills(value: readonly FigmaPaint[]) {
    const length = this.#host.characters.length
    if (length > 0) this.#host.setRangeFills(0, length, [...value])
  }
}

/** A layer's shape-with-text kind, or none for any other layer. */
export function shapeTypeOf(node: SceneNode): ShapeWithTextType | undefined {
  return node.type === 'SHAPE_WITH_TEXT' ? node.shapeWithTextType : undefined
}

/** `value` as a kind for `node`, refused as Figma refuses it. */
export function checkedShapeType(node: SceneNode, value: unknown): ShapeWithTextType {
  if (node.type !== 'SHAPE_WITH_TEXT') {
    throw new Error('in set_shapeType: Only a shape with text has a shape type')
  }
  if (!isShapeWithTextType(value)) {
    throw new Error(`in set_shapeType: Invalid shape type "${String(value)}"`)
  }
  return value
}
