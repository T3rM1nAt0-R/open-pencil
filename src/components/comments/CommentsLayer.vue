<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import IconLucideMessageCircle from '~icons/lucide/message-circle'
import IconLucideMessageCirclePlus from '~icons/lucide/message-circle-plus'

import { pinPosition, useComments } from '@/app/comments/use'
import { useEditorStore } from '@/app/editor/active-store'

import CommentsPanel from './CommentsPanel.vue'
import CommentThreadCard from './CommentThreadCard.vue'

const { canvasEl } = defineProps<{ canvasEl: HTMLCanvasElement | null }>()

const store = useEditorStore()
const comments = useComments()
const { commenting, panelOpen, activeThreadId, draft, openCount } = comments

const draftText = ref('')
const draftName = ref(comments.author.value)
const draftInput = ref<HTMLTextAreaElement | null>(null)

onMounted(() => comments.attach(store))
onUnmounted(() => comments.detach())
useEventListener(window, 'keydown', onKeydown)

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
  let number = 0
  return comments.threads.value
    .filter((thread) => !thread.deleted)
    .map((thread) => ({ thread, number: thread.resolved ? 0 : ++number }))
    .filter(
      ({ thread }) => thread.pageId === pageId && (comments.showResolved.value || !thread.resolved)
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

function placeDraft(event: PointerEvent) {
  if (event.button !== 0) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const sx = event.clientX - rect.left
  const sy = event.clientY - rect.top
  comments.startDraft(
    store.state.currentPageId,
    (sx - store.state.panX) / store.state.zoom,
    (sy - store.state.panY) / store.state.zoom
  )
  draftText.value = ''
  void nextTick(() => draftInput.value?.focus())
}

// Scrolling and zooming keep working while placing comments.
function forwardWheel(event: WheelEvent) {
  if (!canvasEl) return
  event.preventDefault()
  canvasEl.dispatchEvent(new WheelEvent('wheel', event))
}

function postDraft() {
  if (!comments.author.value && draftName.value.trim()) comments.setAuthor(draftName.value)
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

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (draft.value) cancelDraft()
  else if (activeThreadId.value) activeThreadId.value = null
  else if (commenting.value) comments.setCommenting(false)
}

watch(commenting, (on) => {
  if (on) panelOpen.value = true
})
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-30" data-test-id="comments-layer">
    <div
      v-if="commenting"
      class="pointer-events-auto absolute inset-0 cursor-crosshair"
      data-test-id="comments-capture"
      @pointerdown.prevent="placeDraft"
      @wheel="forwardWheel"
    />

    <button
      v-for="pin in pins"
      :key="pin.thread.id"
      type="button"
      class="pointer-events-auto absolute flex size-7 -translate-y-full items-center justify-center rounded-full rounded-bl-none border-2 border-white text-xs font-semibold text-white shadow-md"
      :class="[
        pin.thread.resolved ? 'bg-muted opacity-70' : 'bg-accent',
        activeThreadId === pin.thread.id ? 'ring-2 ring-accent ring-offset-1' : ''
      ]"
      :style="{ left: `${pin.left}px`, top: `${pin.top}px` }"
      :title="`${pin.thread.author}: ${pin.thread.text}`"
      data-test-id="comment-pin"
      @pointerdown.stop
      @click.stop="togglePin(pin.thread.id)"
    >
      <template v-if="pin.label">{{ pin.label }}</template>
      <IconLucideMessageCircle v-else class="size-3.5" />
    </button>

    <div
      v-if="draftScreen"
      class="pointer-events-auto absolute"
      :style="{ left: `${draftScreen.left}px`, top: `${draftScreen.top}px` }"
      @pointerdown.stop
    >
      <div
        class="absolute size-7 -translate-y-full rounded-full rounded-bl-none border-2 border-white bg-accent shadow-md"
      />
      <form
        class="absolute top-2 left-0 flex w-72 flex-col gap-2 rounded-lg border border-border bg-panel p-3 text-xs text-surface shadow-xl"
        data-test-id="comment-draft"
        @submit.prevent="postDraft"
      >
        <input
          v-if="!comments.author.value"
          v-model="draftName"
          class="rounded border border-border bg-input px-2 py-1 text-surface outline-none"
          placeholder="Your name"
          data-test-id="comment-author-input"
        />
        <textarea
          ref="draftInput"
          v-model="draftText"
          rows="3"
          class="resize-none rounded border border-border bg-input px-2 py-1 text-surface outline-none"
          placeholder="Add a comment"
          data-test-id="comment-draft-input"
          @keydown.enter.exact.prevent="postDraft"
          @keydown.escape.stop.prevent="cancelDraft"
        />
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded px-2 py-1 text-muted hover:bg-hover"
            @click="cancelDraft"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded bg-accent px-3 py-1 font-medium text-white disabled:opacity-50"
            :disabled="!draftText.trim()"
            data-test-id="comment-post"
          >
            Post
          </button>
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
      <button
        type="button"
        class="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs shadow-sm"
        :class="commenting ? 'bg-accent text-white' : 'bg-panel text-surface hover:bg-hover'"
        title="Click anywhere on the canvas to leave a comment (Esc to stop)"
        data-test-id="comments-add-toggle"
        @click="comments.setCommenting(!commenting)"
      >
        <IconLucideMessageCirclePlus class="size-3.5" />
        {{ commenting ? 'Done' : 'Comment' }}
      </button>
      <button
        type="button"
        class="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs shadow-sm"
        :class="panelOpen ? 'bg-hover text-surface' : 'bg-panel text-surface hover:bg-hover'"
        title="Show all comments"
        data-test-id="comments-panel-toggle"
        @click="panelOpen = !panelOpen"
      >
        <IconLucideMessageCircle class="size-3.5" />
        {{ openCount }}
      </button>
    </div>

    <CommentsPanel
      v-if="panelOpen"
      class="pointer-events-auto absolute top-16 right-2"
      @pointerdown.stop
    />
  </div>
</template>
