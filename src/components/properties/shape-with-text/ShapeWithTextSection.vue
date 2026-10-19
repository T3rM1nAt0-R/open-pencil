<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useShapeMessages, useShapeWithText } from '@open-pencil/vue'

import { SHAPE_KIND_ICONS } from '@/app/editor/shape-icons'
import { useShapeKindLabels } from '@/components/shapes/labels'
import ShapeKindPicker from '@/components/shapes/ShapeKindPicker.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import theme from '@/theme/select/app'

/** The selected shapes' kind, switched in place as FigJam's shape switcher does. */
const shapes = useShapeMessages()
const { active, kind, setKind } = useShapeWithText()
const label = useShapeKindLabels()
const styles = tv(theme)()
</script>

<template>
  <PanelSection v-if="active && kind" :label="shapes.kind">
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
  </PanelSection>
</template>
