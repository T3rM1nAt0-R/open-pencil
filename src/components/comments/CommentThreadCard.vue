<script setup lang="ts">
import { ref } from 'vue'
import IconLucideCheck from '~icons/lucide/check'
import IconLucideRotateCcw from '~icons/lucide/rotate-ccw'
import IconLucideTrash2 from '~icons/lucide/trash-2'
import IconLucideX from '~icons/lucide/x'

import { formatCommentTime } from '@/app/comments/time'
import type { CommentThread } from '@/app/comments/types'
import { useComments } from '@/app/comments/use'

const { thread } = defineProps<{ thread: CommentThread }>()

const comments = useComments()
const replyText = ref('')
const nameText = ref(comments.author.value)

function sendReply() {
  if (!comments.author.value && nameText.value.trim()) comments.setAuthor(nameText.value)
  comments.reply(thread.id, replyText.value)
  replyText.value = ''
}

function remove() {
  if (window.confirm('Delete this comment and its replies?')) comments.deleteThread(thread.id)
}
</script>

<template>
  <div
    class="flex max-h-96 w-80 flex-col rounded-lg border border-border bg-panel text-xs text-surface shadow-xl"
    data-test-id="comment-thread"
  >
    <div class="flex items-center gap-1 border-b border-border px-3 py-2">
      <span class="flex-1 truncate text-muted">
        {{ thread.nodeName ? `On ${thread.nodeName}` : (thread.pageName ?? 'Comment') }}
      </span>
      <button
        type="button"
        class="rounded p-1 text-muted hover:bg-hover hover:text-surface"
        :title="thread.resolved ? 'Reopen' : 'Resolve'"
        data-test-id="comment-resolve"
        @click="comments.setResolved(thread.id, !thread.resolved)"
      >
        <IconLucideRotateCcw v-if="thread.resolved" class="size-3.5" />
        <IconLucideCheck v-else class="size-3.5" />
      </button>
      <button
        type="button"
        class="rounded p-1 text-muted hover:bg-hover hover:text-danger"
        title="Delete"
        data-test-id="comment-delete"
        @click="remove"
      >
        <IconLucideTrash2 class="size-3.5" />
      </button>
      <button
        type="button"
        class="rounded p-1 text-muted hover:bg-hover hover:text-surface"
        title="Close"
        @click="comments.activeThreadId.value = null"
      >
        <IconLucideX class="size-3.5" />
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="font-semibold">{{ thread.author }}</span>
          <span class="text-muted">{{ formatCommentTime(thread.createdAt) }}</span>
          <span v-if="thread.resolved" class="ml-auto text-accent">Resolved</span>
        </div>
        <p class="mt-1 break-words whitespace-pre-wrap">{{ thread.text }}</p>
      </div>
      <div
        v-for="entry in thread.replies.filter((item) => !item.deleted)"
        :key="entry.id"
        class="group"
        data-test-id="comment-reply"
      >
        <div class="flex items-baseline gap-2">
          <span class="font-semibold">{{ entry.author }}</span>
          <span class="text-muted">{{ formatCommentTime(entry.createdAt) }}</span>
          <button
            type="button"
            class="ml-auto hidden text-muted group-hover:block hover:text-danger"
            title="Delete reply"
            @click="comments.deleteReply(thread.id, entry.id)"
          >
            <IconLucideTrash2 class="size-3" />
          </button>
        </div>
        <p class="mt-1 break-words whitespace-pre-wrap">{{ entry.text }}</p>
      </div>
    </div>

    <form class="flex flex-col gap-2 border-t border-border p-2" @submit.prevent="sendReply">
      <input
        v-if="!comments.author.value"
        v-model="nameText"
        class="rounded border border-border bg-input px-2 py-1 text-surface outline-none"
        placeholder="Your name"
      />
      <div class="flex gap-2">
        <input
          v-model="replyText"
          class="min-w-0 flex-1 rounded border border-border bg-input px-2 py-1 text-surface outline-none"
          placeholder="Reply"
          data-test-id="comment-reply-input"
        />
        <button
          type="submit"
          class="rounded bg-accent px-3 py-1 font-medium text-white disabled:opacity-50"
          :disabled="!replyText.trim()"
          data-test-id="comment-reply-send"
        >
          Send
        </button>
      </div>
    </form>
  </div>
</template>
