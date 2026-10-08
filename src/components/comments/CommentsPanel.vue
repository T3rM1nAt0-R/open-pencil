<script setup lang="ts">
import { computed } from 'vue'
import IconLucideRefreshCw from '~icons/lucide/refresh-cw'

import { formatCommentTime } from '@/app/comments/time'
import { useComments } from '@/app/comments/use'
import { useEditorStore } from '@/app/editor/active-store'

const store = useEditorStore()
const comments = useComments()
const { showResolved, status, errorMessage, backend, activeThreadId } = comments

const listed = computed(() =>
  comments.visibleThreads.value
    .slice()
    .sort(
      (a, b) => Number(a.resolved) - Number(b.resolved) || b.updatedAt.localeCompare(a.updatedAt)
    )
)

const where = computed(() => {
  if (status.value === 'error') return `Couldn't sync: ${errorMessage.value ?? 'unknown error'}`
  if (status.value === 'saving') return 'Saving…'
  if (status.value === 'loading') return 'Loading…'
  if (backend.value?.shared) return 'Saved with the design on the shelf'
  return 'Only in this browser. Save the design to the shelf to share comments.'
})

function pageName(pageId: string, fallback?: string) {
  return store.graph.getNode(pageId)?.name ?? fallback ?? ''
}
</script>

<template>
  <div
    class="flex max-h-[70vh] w-72 flex-col rounded-lg border border-border bg-panel text-xs text-surface shadow-xl"
    data-test-id="comments-panel"
  >
    <div class="flex items-center gap-2 border-b border-border px-3 py-2">
      <span class="flex-1 font-semibold">Comments</span>
      <label class="flex items-center gap-1 text-muted">
        <input v-model="showResolved" type="checkbox" class="accent-[var(--color-accent)]" />
        Show resolved
      </label>
      <button
        type="button"
        class="rounded p-1 text-muted hover:bg-hover hover:text-surface"
        title="Check for new comments"
        @click="comments.refresh()"
      >
        <IconLucideRefreshCw class="size-3.5" />
      </button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <p v-if="listed.length === 0" class="px-3 py-4 text-muted">
        No comments yet. Press <b>Comment</b>, then click the canvas.
      </p>
      <button
        v-for="thread in listed"
        :key="thread.id"
        type="button"
        class="flex w-full flex-col gap-1 border-b border-border px-3 py-2 text-left hover:bg-hover"
        :class="[
          thread.resolved ? 'opacity-60' : '',
          activeThreadId === thread.id ? 'bg-hover' : ''
        ]"
        data-test-id="comments-panel-item"
        @click="comments.focusThread(store, thread.id)"
      >
        <span class="flex items-baseline gap-2">
          <span class="font-semibold">{{ thread.author }}</span>
          <span class="text-muted">{{ formatCommentTime(thread.updatedAt) }}</span>
          <span v-if="thread.resolved" class="ml-auto text-accent">Resolved</span>
        </span>
        <span class="line-clamp-2 break-words">{{ thread.text }}</span>
        <span class="text-muted">
          {{ pageName(thread.pageId, thread.pageName) }}
          <template v-if="thread.replies.some((entry) => !entry.deleted)">
            · {{ thread.replies.filter((entry) => !entry.deleted).length }} replies
          </template>
        </span>
      </button>
    </div>
    <p
      class="border-t border-border px-3 py-2 text-muted"
      :class="status === 'error' ? 'text-danger' : ''"
    >
      {{ where }}
    </p>
  </div>
</template>
