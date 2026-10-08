<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { computed, ref } from 'vue'
import IconLucideStamp from '~icons/lucide/stamp'

import { useEditorStore } from '@/app/editor/active-store'
import { applyStamp, STAMP_STATUSES, stampTargets, type StampStatus } from '@/app/stamps/apply'

const store = useEditorStore()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => (open.value = false))

const targets = computed(() => {
  void store.state.selectedIds
  void store.state.sceneVersion
  return stampTargets(store).length
})

const swatch: Record<StampStatus, string> = {
  Built: 'rgb(214 232 212)',
  'Being built': 'rgb(255 242 204)',
  Planned: 'rgb(245 245 245)'
}

async function stamp(status: StampStatus | null) {
  open.value = false
  await applyStamp(store, status)
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-xs text-surface shadow-sm hover:bg-hover disabled:opacity-50"
      :disabled="targets === 0"
      :title="
        targets === 0
          ? 'Select a screen to stamp it Built, Being built or Planned'
          : `Stamp ${targets} selected screen${targets === 1 ? '' : 's'}`
      "
      data-test-id="stamp-toggle"
      @click="open = !open"
    >
      <IconLucideStamp class="size-3.5" />
      Stamp
    </button>
    <div
      v-if="open"
      class="absolute top-8 right-0 flex w-40 flex-col rounded-lg border border-border bg-panel p-1 text-xs text-surface shadow-xl"
      data-test-id="stamp-menu"
    >
      <button
        v-for="status in STAMP_STATUSES"
        :key="status"
        type="button"
        class="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-hover"
        :data-test-id="`stamp-${status.toLowerCase().replace(' ', '-')}`"
        @click="stamp(status)"
      >
        <span
          class="inline-block size-3 rounded-sm border border-border"
          :style="{ background: swatch[status] }"
        />
        {{ status }}
      </button>
      <button
        type="button"
        class="rounded px-2 py-1.5 text-left text-muted hover:bg-hover"
        data-test-id="stamp-remove"
        @click="stamp(null)"
      >
        Remove stamp
      </button>
    </div>
  </div>
</template>
