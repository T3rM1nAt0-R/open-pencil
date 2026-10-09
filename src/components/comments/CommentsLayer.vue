<script setup lang="ts">
import { ContextMenuContent, ContextMenuPortal, ContextMenuRoot, ContextMenuTrigger } from 'reka-ui'
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import { useCommentMessages, useCommonMessages } from '@open-pencil/vue'

import { pinPosition, useComments } from '@/app/comments/use'
import { useEditorStore } from '@/app/editor/active-store'
import { useActionToast } from '@/app/shell/toast/action'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import Tip from '@/components/ui/overlay/Tip.vue'

import CommentActionsMenu from './CommentActionsMenu.vue'
import CommentsPanel from './CommentsPanel.vue'
import CommentThreadCard from './CommentThreadCard.vue'

const { canvasEl } = defineProps<{ canvasEl: HTMLCanvasElement | null }>()

const store = useEditorStore()
const comments = useComments()
const messages = useCommentMessages()
const common = useCommonMessages()
const { showActionToast } = useActionToast()
const menuCls = useMenuUI({ content: 'min-w-40' })
const { panelOpen, activeThreadId, draft, openCount, pendingDeleteId, pinsHidden } = comments
const commenting = computed(() => store.state.activeTool === 'COMMENT')

const draftText = ref('')
const draftBox = useTemplateRef<HTMLElement>('draftBox')

onMounted(() => comments.attach(store))
onUnmounted(() => comments.detach())

// Picking another tool drops a comment that was never sent, as in Figma.
watch(commenting, (on) => {
  if (!on) draft.value = null
})

function toScreen(x: number, y: number) {
  return {
    left: x * store.state.zoom + store.state.panX,
    top: y * store.state.zoom + store.state.panY
  }
}

const pins = computed(() => {
  // Layers move without the comment changing; re-place pins on every scene change.
  void store.state.sceneVersion
  const pageId = store.state.currentPageId
  if (pinsHidden.value && !commenting.value) return []
  let number = 0
  return comments.threads.value
    .filter((thread) => !thread.deleted)
    .map((thread) => ({ thread, number: thread.resolved ? 0 : ++number }))
    .filter(
      ({ thread }) =>
        thread.pageId === pageId && (!thread.resolved || comments.showResolvedPins.value)
    )
    .map(({ thread, number: label }) => {
      const at = pinPosition(store, thread)
      return { thread, label, ...toScreen(at.x, at.y) }
    })
})

const activePin = computed(() => pins.value.find((pin) => pin.thread.id === activeThreadId.value))
const draftScreen = computed(() =>
  draft.value && draft.value.pageId === store.state.currentPageId
    ? toScreen(draft.value.x, draft.value.y)
    : null
)

// The dialog closes itself before its confirm event, so hold on to which comment it was for.
const deleteOpen = ref(false)
const deleteTarget = ref<string | null>(null)
watch(pendingDeleteId, (id) => {
  if (!id) return
  deleteTarget.value = id
  deleteOpen.value = true
  pendingDeleteId.value = null
})

function confirmDelete() {
  if (!deleteTarget.value) return
  comments.deleteThread(deleteTarget.value)
  deleteTarget.value = null
  showActionToast(messages.value.commentDeleted)
}

function placeDraft(event: PointerEvent) {
  if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return
  const rect = event.currentTarget.getBoundingClientRect()
  const sx = event.clientX - rect.left
  const sy = event.clientY - rect.top
  comments.startDraft(
    store.state.currentPageId,
    (sx - store.state.panX) / store.state.zoom,
    (sy - store.state.panY) / store.state.zoom
  )
  draftText.value = ''
  void nextTick(() => draftBox.value?.querySelector('textarea')?.focus())
}

// Scrolling and zooming keep working while placing comments.
function forwardWheel(event: WheelEvent) {
  if (!canvasEl) return
  event.preventDefault()
  canvasEl.dispatchEvent(new WheelEvent('wheel', event))
}

function postDraft() {
  comments.addThread(draftText.value)
  draftText.value = ''
}

function cancelDraft() {
  draft.value = null
  draftText.value = ''
}

function togglePin(threadId: string) {
  draft.value = null
  activeThreadId.value = activeThreadId.value === threadId ? null : threadId
}
</script>

<template>
  <!-- Right-clicks here belong to comments, not to the canvas layer menu underneath. -->
  <div
    class="pointer-events-none absolute inset-0 z-30"
    data-canvas-overlay="comments"
    @contextmenu.stop
  >
    <div
      v-if="commenting"
      class="pointer-events-auto absolute inset-0 cursor-crosshair"
      data-slot="comments-capture"
      @pointerdown.prevent="placeDraft"
      @wheel="forwardWheel"
      @contextmenu.prevent
    />

    <ContextMenuRoot v-for="pin in pins" :key="pin.thread.id" :modal="false">
      <ContextMenuTrigger as-child>
        <button
          type="button"
          class="pointer-events-auto absolute flex size-7 -translate-y-full items-center justify-center rounded-full rounded-bl-none border-2 border-white bg-accent text-xs font-semibold text-white shadow-md data-[active]:ring-2 data-[active]:ring-accent data-[active]:ring-offset-1 data-[resolved]:bg-muted data-[resolved]:opacity-70"
          :data-resolved="pin.thread.resolved || undefined"
          :data-active="activeThreadId === pin.thread.id || undefined"
          :style="{ left: `${pin.left}px`, top: `${pin.top}px` }"
          :aria-label="`${pin.thread.author || messages.someone}: ${pin.thread.text}`"
          data-slot="comment-pin"
          @pointerdown.stop
          @click.stop="togglePin(pin.thread.id)"
        >
          <template v-if="pin.label">{{ pin.label }}</template>
          <icon-lucide-message-circle v-else class="size-3.5" />
        </button>
      </ContextMenuTrigger>
      <ContextMenuPortal>
        <ContextMenuContent :class="menuCls.content">
          <CommentActionsMenu :thread="pin.thread" kind="context" />
        </ContextMenuContent>
      </ContextMenuPortal>
    </ContextMenuRoot>

    <div
      v-if="draftScreen"
      ref="draftBox"
      class="pointer-events-auto absolute"
      :style="{ left: `${draftScreen.left}px`, top: `${draftScreen.top}px` }"
      @pointerdown.stop
    >
      <div
        class="absolute size-7 -translate-y-full rounded-full rounded-bl-none border-2 border-white bg-accent shadow-md"
      />
      <form
        class="absolute top-2 left-0 flex w-72 flex-col gap-2 rounded-lg border border-border bg-panel p-3 text-xs text-surface shadow-xl"
        data-slot="comment-draft"
        @submit.prevent="postDraft"
      >
        <AppTextarea
          v-model="draftText"
          :rows="3"
          :aria-label="messages.addComment"
          :placeholder="messages.addComment"
          @keydown.enter.exact.prevent="postDraft"
          @keydown.escape.stop.prevent="cancelDraft"
        />
        <div class="flex justify-end gap-2">
          <AppButton @click="cancelDraft">{{ common.cancel }}</AppButton>
          <AppButton type="submit" color="primary" variant="solid" :disabled="!draftText.trim()">
            {{ messages.post }}
          </AppButton>
        </div>
      </form>
    </div>

    <div
      v-if="activePin"
      class="pointer-events-auto absolute"
      :style="{ left: `${activePin.left + 18}px`, top: `${activePin.top}px` }"
      @pointerdown.stop
    >
      <CommentThreadCard :thread="activePin.thread" class="absolute top-0 left-0" />
    </div>

    <div class="pointer-events-auto absolute top-7 right-2 flex gap-1" @pointerdown.stop>
      <Tip :label="messages.comments">
        <button
          type="button"
          class="flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-xs text-surface shadow-sm hover:bg-hover aria-pressed:bg-hover"
          :aria-pressed="panelOpen"
          :aria-label="messages.comments"
          data-slot="comments-panel-toggle"
          @click="panelOpen = !panelOpen"
        >
          <icon-lucide-message-circle class="size-3.5" />
          {{ openCount }}
        </button>
      </Tip>
    </div>

    <CommentsPanel
      v-if="panelOpen"
      class="pointer-events-auto absolute top-16 right-2"
      @pointerdown.stop
    />

    <AppConfirmationDialog
      v-model:open="deleteOpen"
      :heading="messages.deleteComment"
      :description="messages.deleteCommentDescription"
      :cancel-label="common.cancel"
      :confirm-label="messages.delete"
      tone="danger"
      @confirm="confirmDelete"
    />
  </div>
</template>
