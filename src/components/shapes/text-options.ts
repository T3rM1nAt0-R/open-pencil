import { computed } from 'vue'

import type { FigJamTextSize, FigJamTypeface } from '@open-pencil/scene-graph'
import { useI18n, useShapeMessages } from '@open-pencil/vue'

/** FigJam's text sizes and typefaces as select options, shared by sticky notes and shapes. */
export function useFigJamTextOptions() {
  const { panels } = useI18n()
  const shapes = useShapeMessages()
  const sizeOptions = computed<Array<{ value: FigJamTextSize; label: string }>>(() => [
    { value: 'small', label: panels.value.stickyTextSmall },
    { value: 'medium', label: panels.value.stickyTextMedium },
    { value: 'large', label: panels.value.stickyTextLarge },
    { value: 'extraLarge', label: panels.value.stickyTextExtraLarge },
    { value: 'huge', label: panels.value.stickyTextHuge }
  ])
  const typefaceOptions = computed<Array<{ value: FigJamTypeface; label: string }>>(() => [
    { value: 'simple', label: shapes.value.typefaceSimple },
    { value: 'bookish', label: shapes.value.typefaceBookish },
    { value: 'technical', label: shapes.value.typefaceTechnical },
    { value: 'scribbled', label: shapes.value.typefaceScribbled }
  ])
  return { sizeOptions, typefaceOptions }
}
