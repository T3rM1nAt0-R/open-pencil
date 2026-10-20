<script setup lang="ts">
import { camelCase, upperFirst } from 'es-toolkit/string'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { FIGJAM_COLOR_NAMES, figJamColor, type FigJamColorName } from '@open-pencil/scene-graph'
import { colorToHex } from '@open-pencil/scene-graph/color'
import { useShapeMessages } from '@open-pencil/vue'

import theme from '@/theme/figjam-palette'

/**
 * FigJam's board palette as swatches, in its menus' order: two rows of 11 and 10, closed by a
 * swatch for no colour at all, as a shape without fill or outline has.
 */
const { label, selected, noneLabel, none } = defineProps<{
  label: string
  selected: FigJamColorName | null
  noneLabel: string
  /** Whether no colour is shown, which the none swatch marks. */
  none: boolean
}>()
const emit = defineEmits<{ select: [name: FigJamColorName]; none: [] }>()
const shapes = useShapeMessages()
const styles = tv(theme)

type ShapeMessages = (typeof shapes)['value']

const swatches = computed(() =>
  FIGJAM_COLOR_NAMES.map((name) => {
    const key = `color${upperFirst(camelCase(name))}` as keyof ShapeMessages
    return {
      name,
      hex: colorToHex(figJamColor(name)),
      label: String(shapes.value[key]),
      active: !none && name === selected
    }
  })
)
</script>

<template>
  <div :class="styles().swatches()" role="radiogroup" :aria-label="label">
    <button
      v-for="swatch in swatches"
      :key="swatch.name"
      type="button"
      role="radio"
      :aria-checked="swatch.active"
      :aria-label="swatch.label"
      :data-figjam-color="swatch.name"
      :class="styles({ active: swatch.active }).swatch()"
      :style="{ backgroundColor: swatch.hex }"
      @click="emit('select', swatch.name)"
    />
    <button
      type="button"
      role="radio"
      :aria-checked="none"
      :aria-label="noneLabel"
      data-figjam-color="none"
      :class="styles({ active: none }).swatch({ class: styles().none() })"
      @click="emit('none')"
    >
      <icon-lucide-ban class="size-3.5" />
    </button>
  </div>
</template>
