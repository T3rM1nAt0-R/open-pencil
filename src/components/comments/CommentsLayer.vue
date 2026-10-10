<script setup lang="ts">
import {
  ContextMenuContent,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot
} from 'reka-ui'
import { computed, nextTick, onMounted, onUnmounted, ref, toRef, useTemplateRef, watch } from 'vue'

import type { Vector } from '@open-pencil/scene-graph/primitives'
import { useCanvasVirtualReference, useCommentMessages, useCommonMessages } from '@open-pencil/vue'

import { pinPosition, useComments } from '@/app/comments/use'
import { useEditorStore } from '@/app/editor/active-store'
import { useActionToast } from '@/app/shell/toast/action'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import { useMenuUI } from '@/components/ui/menu/menu'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import { comments as commentsTheme } from '@/theme/comments'

import CommentActionsMenu from './CommentActionsMenu.vue'
import CommentComposer from './CommentComposer.vue'
import CommentPin from './CommentPin.vue'
import CommentThreadCard from './CommentThreadCard.vue'

const { canvasEl } = defineProps<{ canvasEl: HTMLCanvasElement | null }>()

const store = useEditorStore()
const comments = useComments()
const messages = useCommentMessages()
const common = useCommonMessages()
const { showActionToast } = useActionToast()
const menuCls = useMenuUI({ content: 'min-w-40' })
const ui = commentsTheme()
const popoverCls = usePopoverUI({ content: ui.card() })
const { activeThreadId, draft, pendingDeleteId, pinsHidden, listShowResolved } = comments
const commenting = computed(() => store.state.activeTool === 'COMMENT')

const draftText = ref('')
const draftComposer = useTemplateRef<{ focus: () => void }>('draftComposer')
const threadCard = useTemplateRef<{ focus: () => void }>('threadCard')

onMounted(() => comments.attach(store))
onUnmounted(() => comments.detach())

// Picking another tool drops a comment that was never sent, as in Figma.
watch(commenting, (on) => {
  if (!on) draft.value = null
})

function toScreen(at: Vector) {
  return {
    left: at.x * store.state.zoom + store.state.panX,
    top: at.y * store.state.zoom + store.state.panY
  }
}

// A pin follows the pointer once it moves a few pixels; a shorter press is a click.
const PIN_DRAG_THRESHOLD = 3
interface PinDrag {
  id: string
  startX: number
  startY: number
  origin: Vector
  at: Vector
  moved: boolean
}
const pinDrag = ref<PinDrag | null>(null)
let dragJustEnded = false

function startPinDrag(event: PointerEvent, threadId: string, origin: Vector) {
  if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return
  event.currentTarget.setPointerCapture(event.pointerId)
  pinDrag.value = {
    id: threadId,
    startX: event.clientX,
    startY: event.clientY,
    origin,
    at: origin,
    moved: false
  }
}

function movePinDrag(event: PointerEvent) {
  const drag = pinDrag.value
  if (!drag) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (!drag.moved && Math.hypot(dx, dy) < PIN_DRAG_THRESHOLD) return
  drag.moved = true
  drag.at = { x: drag.origin.x + dx / store.state.zoom, y: drag.origin.y + dy / store.state.zoom }
}

function endPinDrag() {
  const drag = pinDrag.value
  pinDrag.value = null
  if (!drag?.moved) return
  dragJustEnded = true
  comments.movePin(drag.id, drag.at)
}

function onPinClick(threadId: string) {
  // The click that ends a drag only drops the pin.
  if (dragJustEnded) {
    dragJustEnded = false
    return
  }
  togglePin(threadId)
}

// Pins show unless Shift+C hid them; the Comment tool always shows them, as in Figma.
const pins = computed(() => {
  // Layers move without the comment changing; re-place pins on every scene change.
  void store.state.sceneVersion
  if (pinsHidden.value && !commenting.value) return []
  const pageId = store.state.currentPageId
  return comments.threads.value
    .filter(
      (thread) =>
        !thread.deleted && thread.pageId === pageId && (!thread.resolved || listShowResolved.value)
    )
    .map((thread) => {
      const dragged = pinDrag.value?.id === thread.id && pinDrag.value.moved
      const at = dragged && pinDrag.value ? pinDrag.value.at : pinPosition(store, thread)
      return { thread, at, dragging: dragged, ...toScreen(at) }
    })
})

const activePin = computed(() => pins.value.find((pin) => pin.thread.id === activeThreadId.value))
const draftAt = computed(() =>
  draft.value && draft.value.pageId === store.state.currentPageId ? draft.value : null
)
const draftScreen = computed(() => draftAt.value && toScreen(draftAt.value))

// The card sits right of the pin's bubble, which rises above and right of the commented spot.
const PIN_SIZE = 32
const cardAnchor = computed(() => activePin.value?.at ?? draftAt.value ?? null)
const cardReference = useCanvasVirtualReference(
  toRef(() => canvasEl),
  store,
  cardAnchor
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
  // With a card open, a click on the canvas only closes it, as in Figma.
  if (draft.value || activeThreadId.value) {
    closeCard()
    return
  }
  const rect = event.currentTarget.getBoundingClientRect()
  comments.startDraft(
    store.state.currentPageId,
    (event.clientX - rect.left - store.state.panX) / store.state.zoom,
    (event.clientY - rect.top - store.state.panY) / store.state.zoom
  )
  draftText.value = ''
}

// Scrolling and zooming keep working while placing comments.
function forwardWheel(event: WheelEvent) {
  if (!canvasEl) return
  event.preventDefault()
  canvasEl.dispatchEvent(new WheelEvent('wheel', event))
}

function postDraft(text: string) {
  comments.addThread(text)
  draftText.value = ''
}

function closeCard() {
  draft.value = null
  activeThreadId.value = null
}

function togglePin(threadId: string) {
  draft.value = null
  activeThreadId.value = activeThreadId.value === threadId ? null : threadId
}

function withActiveThread(run: (threadId: string) => void) {
  const threadId = activePin.value?.thread.id
  if (threadId) run(threadId)
}

function focusCard() {
  const card = draftAt.value ? draftComposer.value : threadCard.value
  card?.focus()
}

function onCardOpen(event: Event) {
  event.preventDefault()
  focusCard()
}

// The card stays open when a sent comment becomes its thread or another pin is picked.
const cardKey = computed(() => (draftAt.value ? 'draft' : (activePin.value?.thread.id ?? null)))
watch(cardKey, (key) => key && void nextTick(focusCard), { flush: 'post' })

// Escape closes the card only; the editor's Escape would leave the Comment tool as well.
function onCardEscape(event: KeyboardEvent) {
  event.stopPropagation()
}
</script>

<template>
  <!-- Right-clicks here belong to comments, not to the canvas layer menu underneath. -->
  <div :class="ui.layer()" data-canvas-overlay="comments" @contextmenu.stop>
    <div
      v-if="commenting"
      :class="ui.capture()"
      data-slot="comments-capture"
      @pointerdown.prevent="placeDraft"
      @wheel="forwardWheel"
      @contextmenu.prevent
    />

    <ContextMenuRoot v-for="pin in pins" :key="pin.thread.id" :modal="false">
      <ContextMenuTrigger as-child>
        <CommentPin
          :author="pin.thread.author || messages.someone"
          :color="pin.thread.authorColor"
          :text="pin.thread.text"
          :at="pin.thread.createdAt"
          :active="activeThreadId === pin.thread.id"
          :resolved="pin.thread.resolved"
          :dragging="pin.dragging"
          :style="{ left: `${pin.left}px`, top: `${pin.top}px` }"
          :aria-label="`${pin.thread.author || messages.someone}: ${pin.thread.text}`"
          @pointerdown.stop="startPinDrag($event, pin.thread.id, pin.at)"
          @pointermove="movePinDrag"
          @pointerup="endPinDrag"
          @pointercancel="endPinDrag"
          @click.stop="onPinClick(pin.thread.id)"
        />
      </ContextMenuTrigger>
      <ContextMenuPortal>
        <ContextMenuContent :class="menuCls.content">
          <CommentActionsMenu :thread="pin.thread" kind="context" />
        </ContextMenuContent>
      </ContextMenuPortal>
    </ContextMenuRoot>

    <CommentPin
      v-if="draftScreen"
      draft
      :style="{ left: `${draftScreen.left}px`, top: `${draftScreen.top}px` }"
      aria-hidden="true"
      tabindex="-1"
    />

    <PopoverRoot
      :open="!!cardReference && (!!activePin || !!draftAt)"
      @update:open="(open: boolean) => !open && closeCard()"
    >
      <PopoverPortal>
        <PopoverContent
          v-if="cardReference"
          :reference="cardReference"
          side="right"
          align="start"
          :side-offset="PIN_SIZE + 8"
          :align-offset="-PIN_SIZE"
          :collision-padding="8"
          :class="popoverCls.content"
          data-canvas-obstacle
          @open-auto-focus="onCardOpen"
          @escape-key-down="onCardEscape"
        >
          <div v-if="draftAt" data-slot="comment-draft" :class="ui.draft()">
            <CommentComposer
              ref="draftComposer"
              v-model="draftText"
              :label="messages.addComment"
              @submit="postDraft"
              @cancel="closeCard"
            />
          </div>
          <CommentThreadCard
            v-else-if="activePin"
            ref="threadCard"
            :thread="activePin.thread"
            @close="closeCard"
            @resolve="
              (resolved: boolean) => withActiveThread((id) => comments.setResolved(id, resolved))
            "
            @reply="(text: string) => withActiveThread((id) => comments.reply(id, text))"
            @delete-reply="
              (replyId: string) => withActiveThread((id) => comments.deleteReply(id, replyId))
            "
          >
            <template #menu>
              <CommentActionsMenu :thread="activePin.thread" kind="dropdown" />
            </template>
          </CommentThreadCard>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

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
