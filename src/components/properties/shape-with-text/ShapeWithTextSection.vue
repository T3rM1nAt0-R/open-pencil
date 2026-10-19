<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import {
  isFigJamTypeface,
  type FigJamFillMode,
  type FigJamLineStyle,
  type FigJamTextSize
} from '@open-pencil/scene-graph'
import { useI18n, useShapeMessages, useShapeWithText } from '@open-pencil/vue'

import { SHAPE_KIND_ICONS } from '@/app/editor/shape-icons'
import FigJamPalette from '@/components/shapes/FigJamPalette.vue'
import { useShapeKindLabels } from '@/components/shapes/labels'
import ShapeKindPicker from '@/components/shapes/ShapeKindPicker.vue'
import { useFigJamTextOptions } from '@/components/shapes/text-options'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import theme from '@/theme/select/app'

/**
 * The selected shapes' kind, colour, outline and text, as FigJam's selection toolbar sets them:
 * its palette and fill modes, solid or dashed lines, and its text sizes and typefaces.
 */
const shapes = useShapeMessages()
const { panels } = useI18n()
const {
  active,
  kind,
  color,
  fillMode,
  lineStyle,
  lineColor,
  textSize,
  typeface,
  labelFont,
  setKind,
  setColor,
  setFillMode,
  setLineStyle,
  setLineColor,
  setTextSize,
  setTypeface
} = useShapeWithText()
const label = useShapeKindLabels()

const { sizeOptions, typefaceOptions } = useFigJamTextOptions()
const typefaceName = computed(() => labelFont.value ?? shapes.value.typeface)
const styles = tv(theme)()

const fillOptions = computed<Array<{ value: FigJamFillMode; label: string }>>(() => [
  { value: 'fill', label: shapes.value.fillSolid },
  { value: 'transparent', label: shapes.value.fillTransparent },
  { value: 'none', label: shapes.value.fillNone }
])
const lineOptions = computed<Array<{ value: FigJamLineStyle; label: string }>>(() => [
  { value: 'solid', label: shapes.value.lineSolid },
  { value: 'dashed', label: shapes.value.lineDashed },
  { value: 'none', label: shapes.value.lineNone }
])

const selectedFill = computed<FigJamFillMode>({
  get: () => fillMode.value ?? 'fill',
  set: setFillMode
})
const selectedLine = computed<FigJamLineStyle>({
  get: () => lineStyle.value ?? 'solid',
  set: setLineStyle
})
const selectedSize = computed<FigJamTextSize>({
  get: () => textSize.value ?? 'small',
  set: setTextSize
})
// A face FigJam's menu does not offer matches no option, and the select shows its name instead.
const selectedTypeface = computed<string>({
  get: () => typeface.value ?? '',
  set: (value) => {
    if (isFigJamTypeface(value)) void setTypeface(value)
  }
})
</script>

<template>
  <PanelSection v-if="active && kind" :label="shapes.kind">
    <div class="grid gap-2.5">
      <ShapeKindPicker
        :heading="shapes.kind"
        :selected="kind"
        side="left"
        align="start"
        @select="setKind"
      >
        <template #trigger>
          <button
            type="button"
            aria-haspopup="listbox"
            data-property="shape-kind"
            :aria-label="shapes.kind"
            :class="styles.trigger()"
          >
            <component :is="SHAPE_KIND_ICONS[kind]" class="mr-1.5 size-4 text-muted" />
            <span :class="styles.value()">{{ label(kind) }}</span>
            <icon-lucide-chevron-down class="ml-1 size-3 shrink-0 text-muted" />
          </button>
        </template>
      </ShapeKindPicker>
      <PanelFieldGroup :label="shapes.fill">
        <div class="grid gap-1.5">
          <FigJamPalette :label="shapes.fill" :selected="color" @select="setColor" />
          <AppSelect
            v-model="selectedFill"
            :label="shapes.fill"
            :options="fillOptions"
            data-property="shape-fill-mode"
          />
        </div>
      </PanelFieldGroup>
      <PanelFieldGroup :label="shapes.line">
        <div class="grid gap-1.5">
          <FigJamPalette :label="shapes.line" :selected="lineColor" @select="setLineColor" />
          <AppSelect
            v-model="selectedLine"
            :label="shapes.line"
            :options="lineOptions"
            data-property="shape-line-style"
          />
        </div>
      </PanelFieldGroup>
      <PanelFieldGroup :label="panels.stickyTextSize">
        <AppSelect
          v-model="selectedSize"
          :label="panels.stickyTextSize"
          :options="sizeOptions"
          data-property="shape-text-size"
        />
      </PanelFieldGroup>
      <PanelFieldGroup :label="shapes.typeface">
        <AppSelect
          v-model="selectedTypeface"
          :label="shapes.typeface"
          :placeholder="typefaceName"
          :options="typefaceOptions"
          data-property="shape-typeface"
        />
      </PanelFieldGroup>
    </div>
  </PanelSection>
</template>
