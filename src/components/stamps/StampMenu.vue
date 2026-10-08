<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed } from 'vue'

import { useStampMessages } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import { applyStamp, STAMP_STATUSES, stampTargets, type StampStatus } from '@/app/stamps/apply'
import { useMenuUI } from '@/components/ui/menu/menu'
import Tip from '@/components/ui/overlay/Tip.vue'

const store = useEditorStore()
const messages = useStampMessages()
const menuCls = useMenuUI({ content: 'min-w-40', item: 'justify-start gap-2' })

const targets = computed(() => {
  void store.state.selectedIds
  void store.state.sceneVersion
  return stampTargets(store).length
})

// The tag written into the design stays in English: scripts read it back.
const label = computed<Record<StampStatus, string>>(() => ({
  Built: messages.value.built,
  'Being built': messages.value.beingBuilt,
  Planned: messages.value.planned
}))

const swatch: Record<StampStatus, string> = {
  Built: 'bg-[rgb(214_232_212)]',
  'Being built': 'bg-[rgb(255_242_204)]',
  Planned: 'bg-[rgb(245_245_245)]'
}
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <Tip
      :label="targets === 0 ? messages.selectToStamp : messages.stampSelected({ count: targets })"
    >
      <DropdownMenuTrigger
        class="flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-xs text-surface shadow-sm hover:bg-hover disabled:opacity-50"
        :disabled="targets === 0"
        data-command="stamp-menu"
      >
        <icon-lucide-stamp class="size-3.5" />
        {{ messages.stamp }}
      </DropdownMenuTrigger>
    </Tip>
    <DropdownMenuPortal>
      <DropdownMenuContent :class="menuCls.content" align="end" :side-offset="4">
        <DropdownMenuItem
          v-for="status in STAMP_STATUSES"
          :key="status"
          :class="menuCls.item"
          :data-stamp="status"
          @select="applyStamp(store, status)"
        >
          <span
            class="inline-block size-3 rounded-sm border border-border"
            :class="swatch[status]"
          />
          {{ label[status] }}
        </DropdownMenuItem>
        <DropdownMenuSeparator :class="menuCls.separator" />
        <DropdownMenuItem :class="menuCls.item" data-stamp="none" @select="applyStamp(store, null)">
          {{ messages.removeStamp }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
