import type { ShapeWithTextType } from './shape-with-text'

export interface LabelBox {
  x: number
  y: number
  width: number
  height: number
}

/** Fractions of the box, left/top/right/bottom, left free around the label so it stays inside the shape. */
const LABEL_INSET: Partial<Record<ShapeWithTextType, readonly [number, number, number, number]>> = {
  ELLIPSE: [0.15, 0.15, 0.15, 0.15],
  SUMMING_JUNCTION: [0.15, 0.15, 0.15, 0.15],
  OR: [0.15, 0.15, 0.15, 0.15],
  DIAMOND: [0.25, 0.25, 0.25, 0.25],
  TRIANGLE_UP: [0.25, 0.45, 0.25, 0.05],
  TRIANGLE_DOWN: [0.25, 0.05, 0.25, 0.45],
  PARALLELOGRAM_RIGHT: [0.2, 0, 0.2, 0],
  PARALLELOGRAM_LEFT: [0.2, 0, 0.2, 0],
  TRAPEZOID: [0.2, 0, 0.2, 0],
  ENG_DATABASE: [0, 0.3, 0, 0.15],
  ENG_QUEUE: [0.15, 0, 0.3, 0],
  ENG_FOLDER: [0, 0.18, 0, 0],
  PREDEFINED_PROCESS: [0.1, 0, 0.1, 0],
  SHIELD: [0.1, 0, 0.1, 0.25],
  DOCUMENT_SINGLE: [0, 0, 0, 0.15],
  DOCUMENT_MULTIPLE: [0, 0.12, 0.12, 0.15],
  MANUAL_INPUT: [0, 0.25, 0, 0],
  HEXAGON: [0.2, 0, 0.2, 0],
  CHEVRON: [0.25, 0, 0.25, 0],
  PENTAGON: [0.15, 0.3, 0.15, 0],
  OCTAGON: [0.1, 0.1, 0.1, 0.1],
  STAR: [0.3, 0.35, 0.3, 0.25],
  PLUS: [0.33, 0.33, 0.33, 0.33],
  ARROW_LEFT: [0.3, 0.25, 0, 0.25],
  ARROW_RIGHT: [0, 0.25, 0.3, 0.25],
  SPEECH_BUBBLE: [0, 0, 0, 0.2],
  INTERNAL_STORAGE: [0.15, 0.15, 0, 0]
}

/** Padding inside the label area along a side `size` long, as FigJam leaves; small shapes leave less. */
function labelPadding(size: number): number {
  return Math.min(8, size * 0.08)
}

/** Where a shape's label sits inside its `width` × `height` box. */
export function shapeWithTextLabelBox(
  type: ShapeWithTextType,
  width: number,
  height: number
): LabelBox {
  const [left, top, right, bottom] = LABEL_INSET[type] ?? [0, 0, 0, 0]
  const fit = (size: number, start: number, free: number) =>
    Math.max(0, Math.min(size * free - labelPadding(size) * 2, size - start))
  const x = Math.min(width * left + labelPadding(width), width / 2)
  const y = Math.min(height * top + labelPadding(height), height / 2)
  return {
    x,
    y,
    width: fit(width, x, 1 - left - right),
    height: fit(height, y, 1 - top - bottom)
  }
}

/** Kinds whose label area shrinks towards their corners; they grow in both directions to stay in shape. */
const GROWS_IN_PROPORTION = new Set<ShapeWithTextType>([
  'ELLIPSE',
  'DIAMOND',
  'TRIANGLE_UP',
  'TRIANGLE_DOWN',
  'HEXAGON',
  'PENTAGON',
  'OCTAGON',
  'STAR',
  'PLUS',
  'SUMMING_JUNCTION',
  'OR'
])

/** Measures a label wrapped at `maxWidth`; its height is what the wrapped lines take. */
export type LabelMeasure = (maxWidth: number) => { width: number; height: number }

export interface ShapeWithTextFit {
  /** The size the shape was given. */
  width: number
  height: number
  /** The width of the label's longest word, which is never split. */
  longestWord: number
  measure: LabelMeasure
}

const LARGEST = 100_000

/** The smallest `value` from `from` up for which `fits` holds, found by doubling then halving. */
function smallestFitting(from: number, fits: (value: number) => boolean): number {
  if (fits(from)) return from
  let low = from
  let high = Math.max(from * 2, from + 16)
  while (!fits(high)) {
    low = high
    high *= 2
    if (high > LARGEST) return LARGEST
  }
  while (high - low > 0.5) {
    const middle = (low + high) / 2
    if (fits(middle)) high = middle
    else low = middle
  }
  return Math.ceil(high)
}

/**
 * The size a shape of `type` takes for its label, as FigJam fits it: it keeps the size it was
 * given while the label fits, never splits a word (a word too wide widens the shape just enough),
 * and otherwise grows taller. Kinds whose label area narrows at their corners, such as ellipses and
 * diamonds, grow in both directions instead, so they keep their proportions.
 */
export function fitShapeWithText(
  type: ShapeWithTextType,
  { width, height, longestWord, measure }: ShapeWithTextFit
): { width: number; height: number } {
  const wordFits = (w: number, h: number) => shapeWithTextLabelBox(type, w, h).width >= longestWord
  const fits = (w: number, h: number) => {
    const box = shapeWithTextLabelBox(type, w, h)
    return box.width >= longestWord && measure(box.width).height <= box.height
  }
  if (width <= 0 || height <= 0 || fits(width, height)) return { width, height }
  if (GROWS_IN_PROPORTION.has(type)) {
    const scale = smallestFitting(1, (s) => fits(width * s, height * s) || width * s >= LARGEST)
    return { width: Math.ceil(width * scale), height: Math.ceil(height * scale) }
  }
  const fittedWidth = smallestFitting(width, (w) => wordFits(w, height) || w >= LARGEST)
  const fittedHeight = smallestFitting(height, (h) => fits(fittedWidth, h) || h >= LARGEST)
  return { width: fittedWidth, height: fittedHeight }
}
