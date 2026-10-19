import { camelCase } from 'es-toolkit/string'
import { computed } from 'vue'

import type { ShapeWithTextType } from '@open-pencil/scene-graph/shape-with-text'
import { useShapeMessages } from '@open-pencil/vue'

type ShapeMessages = ReturnType<typeof useShapeMessages>['value']

/** A kind's name as FigJam's Shapes panel gives it, in the interface language. */
export function shapeKindLabel(messages: ShapeMessages, kind: ShapeWithTextType): string {
  const key = camelCase(kind)
  return key in messages ? String(messages[key as keyof ShapeMessages]) : kind
}

export function useShapeKindLabels() {
  const shapes = useShapeMessages()
  return computed(() => (kind: ShapeWithTextType) => shapeKindLabel(shapes.value, kind))
}
