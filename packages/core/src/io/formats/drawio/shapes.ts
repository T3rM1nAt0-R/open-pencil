import { styleNumber, type DrawioStyle } from './style'

/** The control point offset that makes a cubic curve trace a quarter of an ellipse. */
const KAPPA = 0.5522847498

export type ShapeKind = 'rect' | 'ellipse' | 'path'

export interface ShapeGeometry {
  kind: ShapeKind
  /** SVG path data in the shape's own box, for `path` shapes. */
  path?: string
  /** Whether the path is only an outline, with nothing to fill. */
  outlineOnly?: boolean
}

function n(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  return [
    `M${n(cx - rx)} ${n(cy)}`,
    `C${n(cx - rx)} ${n(cy - ky)} ${n(cx - kx)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)}`,
    `C${n(cx + kx)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - ky)} ${n(cx + rx)} ${n(cy)}`,
    `C${n(cx + rx)} ${n(cy + ky)} ${n(cx + kx)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}`,
    `C${n(cx - kx)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + ky)} ${n(cx - rx)} ${n(cy)}Z`
  ].join('')
}

function cylinderPath(w: number, h: number, size: number): string {
  const ry = Math.min(Math.max(size, 0), h / 2)
  const rx = w / 2
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  const body = [
    `M0 ${n(ry)}`,
    `C0 ${n(ry - ky)} ${n(rx - kx)} 0 ${n(rx)} 0`,
    `C${n(rx + kx)} 0 ${n(w)} ${n(ry - ky)} ${n(w)} ${n(ry)}`,
    `L${n(w)} ${n(h - ry)}`,
    `C${n(w)} ${n(h - ry + ky)} ${n(rx + kx)} ${n(h)} ${n(rx)} ${n(h)}`,
    `C${n(rx - kx)} ${n(h)} 0 ${n(h - ry + ky)} 0 ${n(h - ry)}Z`
  ].join('')
  const rim = [
    `M0 ${n(ry)}`,
    `C0 ${n(ry + ky)} ${n(rx - kx)} ${n(2 * ry)} ${n(rx)} ${n(2 * ry)}`,
    `C${n(rx + kx)} ${n(2 * ry)} ${n(w)} ${n(ry + ky)} ${n(w)} ${n(ry)}`
  ].join('')
  return body + rim
}

function notePath(w: number, h: number, size: number): string {
  const fold = Math.min(Math.max(size, 0), w, h)
  return (
    `M0 0L${n(w - fold)} 0L${n(w)} ${n(fold)}L${n(w)} ${n(h)}L0 ${n(h)}Z` +
    `M${n(w - fold)} 0L${n(w - fold)} ${n(fold)}L${n(w)} ${n(fold)}`
  )
}

function actorPath(w: number, h: number): string {
  const head = Math.min(w / 2, h * 0.16)
  const neck = head * 2
  const hip = h * 0.62
  return (
    ellipsePath(w / 2, head, head, head) +
    `M${n(w / 2)} ${n(neck)}L${n(w / 2)} ${n(hip)}` +
    `M0 ${n(h * 0.38)}L${n(w)} ${n(h * 0.38)}` +
    `M${n(w / 2)} ${n(hip)}L0 ${n(h)}M${n(w / 2)} ${n(hip)}L${n(w)} ${n(h)}`
  )
}

/** draw.io's cloud outline, scaled into a box of `w` by `h`. */
function cloudPath(w: number, h: number): string {
  const curves = [
    [0.05, 0.25, 0, 0.5, 0.16, 0.55],
    [0, 0.66, 0.18, 0.9, 0.31, 0.8],
    [0.4, 1, 0.7, 1, 0.8, 0.8],
    [1, 0.8, 1, 0.6, 0.875, 0.5],
    [1, 0.3, 0.8, 0.1, 0.625, 0.25],
    [0.5, 0.05, 0.3, 0.05, 0.25, 0.25]
  ]
  const point = (x: number, y: number) => `${n(x * w)} ${n(y * h)}`
  const segments = curves.map(
    ([a, b, c, d, e, f]) => `C${point(a, b)} ${point(c, d)} ${point(e, f)}`
  )
  return `M${point(0.25, 0.25)}${segments.join('')}Z`
}

/** The outline a draw.io shape style asks for, drawn in a box of `w` by `h`. */
export function shapeGeometry(style: DrawioStyle, w: number, h: number): ShapeGeometry {
  const shape = style.shape
  if (shape === 'cylinder3') {
    return { kind: 'path', path: cylinderPath(w, h, styleNumber(style, 'size', 15)) }
  }
  if (shape === 'note') {
    return { kind: 'path', path: notePath(w, h, styleNumber(style, 'size', 30)) }
  }
  if (shape === 'umlActor') {
    return { kind: 'path', path: actorPath(w, h), outlineOnly: true }
  }
  if (shape === 'cloud') return { kind: 'path', path: cloudPath(w, h) }
  if (style.ellipse !== undefined || shape === 'ellipse') {
    return { kind: 'ellipse' }
  }
  if (style.rhombus !== undefined || shape === 'rhombus') {
    const path = `M${n(w / 2)} 0L${n(w)} ${n(h / 2)}L${n(w / 2)} ${n(h)}L0 ${n(h / 2)}Z`
    return { kind: 'path', path }
  }
  return { kind: 'rect' }
}
