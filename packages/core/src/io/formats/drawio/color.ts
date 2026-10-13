import { converter, parse } from 'culori'

import type { Color } from '@open-pencil/scene-graph/primitives'

const toRGB = converter('rgb')

/** The colour a CSS colour text names, or null when it names none. */
export function tryParseColor(input: string): Color | null {
  const parsed = parse(input)
  if (!parsed) return null
  const rgb = toRGB(parsed)
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: parsed.alpha ?? 1 }
}
