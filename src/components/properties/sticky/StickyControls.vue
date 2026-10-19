<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import {
  isFigJamTypeface,
  STICKY_COLORS,
  type FigJamTextSize,
  type FigJamTypeface
} from '@open-pencil/scene-graph'
import { colorToHex } from '@open-pencil/scene-graph/color'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { useI18n, useShapeMessages } from '@open-pencil/vue'

import { useFigJamTextOptions } from '@/components/shapes/text-options'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'
import stickyControlsTheme from '@/theme/sticky-controls'

type StickyColorName = keyof typeof STICKY_COLORS

const { color, textSize, authorVisible, typeface, bodyFont } = defineProps<{
  color: Color | null
  textSize: FigJamTextSize | null
  authorVisible: boolean
  typeface: FigJamTypeface | null
  /** The body's font family, which names a face FigJam's typeface menu does not offer. */
  bodyFont?: string
}>()

const emit = defineEmits<{
  'update:color': [value: Color]
  'update:textSize': [value: FigJamTextSize]
  'update:authorVisible': [value: boolean]
  'update:typeface': [value: FigJamTypeface]
}>()

const { panels } = useI18n()
const shapes = useShapeMessages()
const styles = tv(stickyControlsTheme)

const COLOR_LABEL_KEYS = {
  white: 'stickyColorWhite',
  gray: 'stickyColorGray',
  red: 'stickyColorRed',
  orange: 'stickyColorOrange',
  yellow: 'stickyColorYellow',
  green: 'stickyColorGreen',
  teal: 'stickyColorTeal',
  blue: 'stickyColorBlue',
  violet: 'stickyColorViolet',
  pink: 'stickyColorPink'
} as const satisfies Record<StickyColorName, string>

const swatches = computed(() =>
  (Object.entries(STICKY_COLORS) as [StickyColorName, Color][]).map(([name, value]) => ({
    name,
    value,
    hex: colorToHex(value),
    label: panels.value[COLOR_LABEL_KEYS[name]],
    active: color !== null && colorToHex(color) === colorToHex(value)
  }))
)

const { sizeOptions, typefaceOptions } = useFigJamTextOptions()

const selectedSize = computed<FigJamTextSize>({
  get: () => textSize ?? 'small',
  set: (value) => emit('update:textSize', value)
})

// A face FigJam's menu does not offer matches no option, and the select shows its name instead.
const selectedTypeface = computed<string>({
  get: () => typeface ?? '',
  set: (value) => {
    if (isFigJamTypeface(value)) emit('update:typeface', value)
  }
})
</script>

<template>
  <div :class="styles().root()">
    <PanelFieldGroup :label="panels.stickyColor">
      <div :class="styles().swatches()" role="radiogroup" :aria-label="panels.stickyColor">
        <button
          v-for="swatch in swatches"
          :key="swatch.name"
          type="button"
          role="radio"
          :aria-checked="swatch.active"
          :aria-label="swatch.label"
          :data-sticky-color="swatch.name"
          :class="styles({ active: swatch.active }).swatch()"
          :style="{ backgroundColor: swatch.hex }"
          @click="emit('update:color', swatch.value)"
        />
      </div>
    </PanelFieldGroup>
    <PanelFieldGroup :label="panels.stickyTextSize">
      <AppSelect
        v-model="selectedSize"
        :label="panels.stickyTextSize"
        :options="sizeOptions"
        data-property="sticky-text-size"
      />
    </PanelFieldGroup>
    <PanelFieldGroup :label="shapes.typeface">
      <AppSelect
        v-model="selectedTypeface"
        :label="shapes.typeface"
        :placeholder="bodyFont ?? shapes.typeface"
        :options="typefaceOptions"
        data-property="sticky-typeface"
      />
    </PanelFieldGroup>
    <label :class="styles().option()">
      <span>{{ panels.stickyShowAuthor }}</span>
      <AppSwitch
        :model-value="authorVisible"
        :label="panels.stickyShowAuthor"
        data-property="sticky-show-author"
        @update:model-value="emit('update:authorVisible', $event)"
      />
    </label>
  </div>
</template>
