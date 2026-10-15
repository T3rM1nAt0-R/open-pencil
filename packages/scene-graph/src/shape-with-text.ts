import type { PolygonOutlineCommand } from './polygon'

/**
 * FigJam's shape-with-text kinds, as Figma names them in `.fig` files and in its plugin API
 * (`ShapeWithTextNode.shapeType`). Each kind is drawn from its size here, so rendering, hit
 * testing, export and connectors share one outline.
 */
export const SHAPE_WITH_TEXT_TYPES = [
  'SQUARE',
  'ELLIPSE',
  'DIAMOND',
  'TRIANGLE_UP',
  'TRIANGLE_DOWN',
  'ROUNDED_RECTANGLE',
  'PARALLELOGRAM_RIGHT',
  'PARALLELOGRAM_LEFT',
  'ENG_DATABASE',
  'ENG_QUEUE',
  'ENG_FILE',
  'ENG_FOLDER',
  'TRAPEZOID',
  'PREDEFINED_PROCESS',
  'SHIELD',
  'DOCUMENT_SINGLE',
  'DOCUMENT_MULTIPLE',
  'MANUAL_INPUT',
  'HEXAGON',
  'CHEVRON',
  'PENTAGON',
  'OCTAGON',
  'STAR',
  'PLUS',
  'ARROW_LEFT',
  'ARROW_RIGHT',
  'SUMMING_JUNCTION',
  'OR',
  'SPEECH_BUBBLE',
  'INTERNAL_STORAGE'
] as const

export type ShapeWithTextType = (typeof SHAPE_WITH_TEXT_TYPES)[number]

const KNOWN = new Set<string>(SHAPE_WITH_TEXT_TYPES)

export function isShapeWithTextType(value: unknown): value is ShapeWithTextType {
  return typeof value === 'string' && KNOWN.has(value)
}

export interface ShapeWithTextGeometry {
  /** The closed outline that is filled and stroked, and that connectors attach to. */
  outline: PolygonOutlineCommand[]
  /** Inner lines that are stroked only, such as a database's front rim. */
  details: PolygonOutlineCommand[]
}

export interface LabelBox {
  x: number
  y: number
  width: number
  height: number
}

/** Bezier handle length for a quarter ellipse. */
const KAPPA = 0.5522847498

type Point = readonly [number, number]

function polygon(points: Point[]): PolygonOutlineCommand[] {
  const commands: PolygonOutlineCommand[] = points.map(([x, y], index) => ({
    type: index === 0 ? 'M' : 'L',
    x,
    y
  }))
  commands.push({ type: 'Z' })
  return commands
}

function line(from: Point, to: Point): PolygonOutlineCommand[] {
  return [
    { type: 'M', x: from[0], y: from[1] },
    { type: 'L', x: to[0], y: to[1] }
  ]
}

function curve(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
  return { type: 'C', x1, y1, x2, y2, x, y } as const
}

function ellipse(x: number, y: number, w: number, h: number): PolygonOutlineCommand[] {
  const rx = w / 2
  const ry = h / 2
  const cx = x + rx
  const cy = y + ry
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  return [
    { type: 'M', x: cx, y },
    curve(cx + kx, y, x + w, cy - ky, x + w, cy),
    curve(x + w, cy + ky, cx + kx, y + h, cx, y + h),
    curve(cx - kx, y + h, x, cy + ky, x, cy),
    curve(x, cy - ky, cx - kx, y, cx, y),
    { type: 'Z' }
  ]
}

function roundedRect(w: number, h: number, radius: number): PolygonOutlineCommand[] {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  const k = r * (1 - KAPPA)
  return [
    { type: 'M', x: r, y: 0 },
    { type: 'L', x: w - r, y: 0 },
    curve(w - k, 0, w, k, w, r),
    { type: 'L', x: w, y: h - r },
    curve(w, h - k, w - k, h, w - r, h),
    { type: 'L', x: r, y: h },
    curve(k, h, 0, h - k, 0, h - r),
    { type: 'L', x: 0, y: r },
    curve(0, k, k, 0, r, 0),
    { type: 'Z' }
  ]
}

/** A page with a wavy bottom edge, the flowchart "document" symbol. */
function documentPage(x: number, y: number, w: number, h: number): PolygonOutlineCommand[] {
  const wave = h * 0.1
  const base = y + h - wave
  return [
    { type: 'M', x, y },
    { type: 'L', x: x + w, y },
    { type: 'L', x: x + w, y: base },
    curve(x + w * 0.8, base - wave * 1.2, x + w * 0.7, base - wave * 1.2, x + w * 0.5, base),
    curve(x + w * 0.3, base + wave, x + w * 0.2, base + wave, x, base),
    { type: 'Z' }
  ]
}

function star(w: number, h: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const radius = i % 2 === 0 ? 1 : 0.382
    points.push([
      w / 2 + (Math.cos(angle) * radius * w) / 2,
      h / 2 + (Math.sin(angle) * radius * h) / 2 + h * 0.05
    ])
  }
  return points
}

/** A point on the ellipse filling the box, at `angle` radians clockwise from the right. */
function onEllipse(w: number, h: number, angle: number): Point {
  return [w / 2 + (Math.cos(angle) * w) / 2, h / 2 + (Math.sin(angle) * h) / 2]
}

function speechBubble(w: number, h: number): PolygonOutlineCommand[] {
  const body = h * 0.8
  const r = Math.min(w, body) * 0.2
  const k = r * (1 - KAPPA)
  return [
    { type: 'M', x: r, y: 0 },
    { type: 'L', x: w - r, y: 0 },
    curve(w - k, 0, w, k, w, r),
    { type: 'L', x: w, y: body - r },
    curve(w, body - k, w - k, body, w - r, body),
    { type: 'L', x: w * 0.38, y: body },
    { type: 'L', x: w * 0.18, y: h },
    { type: 'L', x: w * 0.22, y: body },
    { type: 'L', x: r, y: body },
    curve(k, body, 0, body - k, 0, body - r),
    { type: 'L', x: 0, y: r },
    curve(0, k, k, 0, r, 0),
    { type: 'Z' }
  ]
}

const plain = (outline: PolygonOutlineCommand[]): ShapeWithTextGeometry => ({
  outline,
  details: []
})

type Builder = (w: number, h: number, min: number) => ShapeWithTextGeometry

/** Each kind's outline and inner lines for a `w` × `h` box, `min` being its shorter side. */
const BUILDERS: Record<ShapeWithTextType, Builder> = {
  SQUARE: (w, h) =>
    plain(
      polygon([
        [0, 0],
        [w, 0],
        [w, h],
        [0, h]
      ])
    ),
  ELLIPSE: (w, h) => plain(ellipse(0, 0, w, h)),
  DIAMOND: (w, h) =>
    plain(
      polygon([
        [w / 2, 0],
        [w, h / 2],
        [w / 2, h],
        [0, h / 2]
      ])
    ),
  TRIANGLE_UP: (w, h) =>
    plain(
      polygon([
        [w / 2, 0],
        [w, h],
        [0, h]
      ])
    ),
  TRIANGLE_DOWN: (w, h) =>
    plain(
      polygon([
        [0, 0],
        [w, 0],
        [w / 2, h]
      ])
    ),
  ROUNDED_RECTANGLE: (w, h, min) => plain(roundedRect(w, h, min * 0.2)),
  PARALLELOGRAM_RIGHT: (w, h) => {
    const s = Math.min(w * 0.2, h * 0.5)
    return plain(
      polygon([
        [s, 0],
        [w, 0],
        [w - s, h],
        [0, h]
      ])
    )
  },
  PARALLELOGRAM_LEFT: (w, h) => {
    const s = Math.min(w * 0.2, h * 0.5)
    return plain(
      polygon([
        [0, 0],
        [w - s, 0],
        [w, h],
        [s, h]
      ])
    )
  },
  ENG_DATABASE: (w, h) => {
    const ry = Math.min(h * 0.15, w * 0.25)
    const kx = (w / 2) * KAPPA
    const ky = ry * KAPPA
    return {
      outline: [
        { type: 'M', x: 0, y: ry },
        curve(0, ry - ky, w / 2 - kx, 0, w / 2, 0),
        curve(w / 2 + kx, 0, w, ry - ky, w, ry),
        { type: 'L', x: w, y: h - ry },
        curve(w, h - ry + ky, w / 2 + kx, h, w / 2, h),
        curve(w / 2 - kx, h, 0, h - ry + ky, 0, h - ry),
        { type: 'Z' }
      ],
      details: [
        { type: 'M', x: 0, y: ry },
        curve(0, ry + ky, w / 2 - kx, ry * 2, w / 2, ry * 2),
        curve(w / 2 + kx, ry * 2, w, ry + ky, w, ry)
      ]
    }
  },
  ENG_QUEUE: (w, h) => {
    const rx = Math.min(w * 0.15, h * 0.25)
    const kx = rx * KAPPA
    const ky = (h / 2) * KAPPA
    return {
      outline: [
        { type: 'M', x: rx, y: 0 },
        { type: 'L', x: w - rx, y: 0 },
        curve(w - rx + kx, 0, w, h / 2 - ky, w, h / 2),
        curve(w, h / 2 + ky, w - rx + kx, h, w - rx, h),
        { type: 'L', x: rx, y: h },
        curve(rx - kx, h, 0, h / 2 + ky, 0, h / 2),
        curve(0, h / 2 - ky, rx - kx, 0, rx, 0),
        { type: 'Z' }
      ],
      details: [
        { type: 'M', x: w - rx, y: 0 },
        curve(w - rx - kx, 0, w - rx * 2, h / 2 - ky, w - rx * 2, h / 2),
        curve(w - rx * 2, h / 2 + ky, w - rx - kx, h, w - rx, h)
      ]
    }
  },
  ENG_FILE: (w, h, min) => {
    const f = min * 0.25
    return {
      outline: polygon([
        [0, 0],
        [w - f, 0],
        [w, f],
        [w, h],
        [0, h]
      ]),
      details: [...line([w - f, 0], [w - f, f]), { type: 'L', x: w, y: f }]
    }
  },
  ENG_FOLDER: (w, h) => {
    const tab = Math.min(h * 0.18, w * 0.2)
    return plain(
      polygon([
        [0, 0],
        [w * 0.4, 0],
        [w * 0.4 + tab, tab],
        [w, tab],
        [w, h],
        [0, h]
      ])
    )
  },
  TRAPEZOID: (w, h) => {
    const s = Math.min(w * 0.2, h)
    return plain(
      polygon([
        [s, 0],
        [w - s, 0],
        [w, h],
        [0, h]
      ])
    )
  },
  PREDEFINED_PROCESS: (w, h) => {
    const e = Math.min(w * 0.1, h * 0.5)
    return {
      outline: polygon([
        [0, 0],
        [w, 0],
        [w, h],
        [0, h]
      ]),
      details: [...line([e, 0], [e, h]), ...line([w - e, 0], [w - e, h])]
    }
  },
  SHIELD: (w, h) =>
    plain([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: w, y: 0 },
      { type: 'L', x: w, y: h * 0.45 },
      curve(w, h * 0.75, w * 0.75, h * 0.9, w / 2, h),
      curve(w * 0.25, h * 0.9, 0, h * 0.75, 0, h * 0.45),
      { type: 'Z' }
    ]),
  DOCUMENT_SINGLE: (w, h) => plain(documentPage(0, 0, w, h)),
  DOCUMENT_MULTIPLE: (w, h, min) => {
    const o = min * 0.06
    return {
      outline: documentPage(0, o * 2, w - o * 2, h - o * 2),
      details: [
        ...line([o, o * 2], [o, o]),
        { type: 'L', x: w - o, y: o },
        { type: 'L', x: w - o, y: h - o * 2 },
        ...line([o * 2, o], [o * 2, 0]),
        { type: 'L', x: w, y: 0 },
        { type: 'L', x: w, y: h - o * 3 }
      ]
    }
  },
  MANUAL_INPUT: (w, h) =>
    plain(
      polygon([
        [0, h * 0.25],
        [w, 0],
        [w, h],
        [0, h]
      ])
    ),
  HEXAGON: (w, h) => {
    const s = Math.min(w * 0.25, h * 0.5)
    return plain(
      polygon([
        [s, 0],
        [w - s, 0],
        [w, h / 2],
        [w - s, h],
        [s, h],
        [0, h / 2]
      ])
    )
  },
  CHEVRON: (w, h) => {
    const p = Math.min(w * 0.25, h * 0.5)
    return plain(
      polygon([
        [0, 0],
        [w - p, 0],
        [w, h / 2],
        [w - p, h],
        [0, h],
        [p, h / 2]
      ])
    )
  },
  PENTAGON: (w, h) =>
    plain(
      polygon([
        [w / 2, 0],
        [w, h * 0.38],
        [w * 0.81, h],
        [w * 0.19, h],
        [0, h * 0.38]
      ])
    ),
  OCTAGON: (w, h, min) => {
    const c = min * 0.29
    return plain(
      polygon([
        [c, 0],
        [w - c, 0],
        [w, c],
        [w, h - c],
        [w - c, h],
        [c, h],
        [0, h - c],
        [0, c]
      ])
    )
  },
  STAR: (w, h) => plain(polygon(star(w, h))),
  PLUS: (w, h) => {
    const a = w / 3
    const b = h / 3
    return plain(
      polygon([
        [a, 0],
        [a * 2, 0],
        [a * 2, b],
        [w, b],
        [w, b * 2],
        [a * 2, b * 2],
        [a * 2, h],
        [a, h],
        [a, b * 2],
        [0, b * 2],
        [0, b],
        [a, b]
      ])
    )
  },
  ARROW_RIGHT: (w, h) => {
    const head = Math.min(w * 0.4, h * 0.5)
    return plain(
      polygon([
        [0, h * 0.25],
        [w - head, h * 0.25],
        [w - head, 0],
        [w, h / 2],
        [w - head, h],
        [w - head, h * 0.75],
        [0, h * 0.75]
      ])
    )
  },
  ARROW_LEFT: (w, h) => {
    const head = Math.min(w * 0.4, h * 0.5)
    return plain(
      polygon([
        [w, h * 0.25],
        [head, h * 0.25],
        [head, 0],
        [0, h / 2],
        [head, h],
        [head, h * 0.75],
        [w, h * 0.75]
      ])
    )
  },
  SUMMING_JUNCTION: (w, h) => {
    const q = Math.PI / 4
    return {
      outline: ellipse(0, 0, w, h),
      details: [
        ...line(onEllipse(w, h, -q), onEllipse(w, h, Math.PI - q)),
        ...line(onEllipse(w, h, q), onEllipse(w, h, Math.PI + q))
      ]
    }
  },
  OR: (w, h) => ({
    outline: ellipse(0, 0, w, h),
    details: [...line([w / 2, 0], [w / 2, h]), ...line([0, h / 2], [w, h / 2])]
  }),
  SPEECH_BUBBLE: (w, h) => plain(speechBubble(w, h)),
  INTERNAL_STORAGE: (w, h, min) => {
    const e = min * 0.15
    return {
      outline: polygon([
        [0, 0],
        [w, 0],
        [w, h],
        [0, h]
      ]),
      details: [...line([e, 0], [e, h]), ...line([0, e], [w, e])]
    }
  }
}

/** The outline and inner lines of a shape of `type` filling a `width` × `height` box. */
export function shapeWithTextGeometry(
  type: ShapeWithTextType,
  width: number,
  height: number
): ShapeWithTextGeometry {
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  return BUILDERS[type](w, h, Math.min(w, h))
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

/** Padding inside the label area, as FigJam leaves around its text. */
const LABEL_PADDING = 8

/** Where a shape's label sits inside its `width` × `height` box. */
export function shapeWithTextLabelBox(
  type: ShapeWithTextType,
  width: number,
  height: number
): LabelBox {
  const [left, top, right, bottom] = LABEL_INSET[type] ?? [0, 0, 0, 0]
  const x = width * left + LABEL_PADDING
  const y = height * top + LABEL_PADDING
  return {
    x: Math.min(x, width / 2),
    y: Math.min(y, height / 2),
    width: Math.max(0, width * (1 - left - right) - LABEL_PADDING * 2),
    height: Math.max(0, height * (1 - top - bottom) - LABEL_PADDING * 2)
  }
}
