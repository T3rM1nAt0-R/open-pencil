<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { isFigJamTypeface, type FigJamTextSize } from '@open-pencil/scene-graph'
import { useI18n, useShapeMessages, useShapeWithText } from '@open-pencil/vue'

import { SHAPE_KIND_ICONS } from '@/app/editor/shape-icons'
import FigJamPalette from '@/components/shapes/FigJamPalette.vue'
import { useShapeKindLabels } from '@/components/shapes/labels'
import ShapeKindPicker from '@/components/shapes/ShapeKindPicker.vue'
import { useFigJamTextOptions } from '@/components/shapes/text-options'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import theme from '@/theme/select/app'

/**
 * The selected shapes' kind, colour, outline and text, as FigJam's selection toolbar sets them:
 * its palette with solid, see-through or no fill, solid, dashed or no outline, and its text sizes
 * and typefaces.
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
    <div class="grid gap-3">
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
      <div>
        <div class="mb-1 flex items-center justify-between">
          <span class="text-[11px] text-muted">{{ shapes.fill }}</span>
          <IconButton
            toggle
            :label="shapes.fillTransparent"
            :active="fillMode === 'transparent'"
            data-property="shape-fill-transparent"
            @click="setFillMode(fillMode === 'transparent' ? 'fill' : 'transparent')"
          >
            <icon-lucide-contrast class="size-3.5" />
          </IconButton>
        </div>
        <FigJamPalette
          :label="shapes.fill"
          :selected="color"
          :none-label="shapes.fillNone"
          :none="fillMode === 'none'"
          @select="setColor"
          @none="setFillMode('none')"
        />
      </div>
      <div>
        <div class="mb-1 flex items-center justify-between">
          <span class="text-[11px] text-muted">{{ shapes.line }}</span>
          <IconButton
            toggle
            :label="shapes.lineDashed"
            :active="lineStyle === 'dashed'"
            data-property="shape-line-dashed"
            @click="setLineStyle(lineStyle === 'dashed' ? 'solid' : 'dashed')"
          >
            <icon-lucide-circle-dashed class="size-3.5" />
          </IconButton>
        </div>
        <FigJamPalette
          :label="shapes.line"
          :selected="lineColor"
          :none-label="shapes.lineNone"
          :none="lineStyle === 'none'"
          @select="setLineColor"
          @none="setLineStyle('none')"
        />
      </div>
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
