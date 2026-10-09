<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { ref } from 'vue'

import type { CommentThread } from '@open-pencil/scene-graph'
import { useCommentMessages, useCommonMessages } from '@open-pencil/vue'

import { useComments } from '@/app/comments/use'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import { useMenuUI } from '@/components/ui/menu/menu'

import CommentActionsMenu from './CommentActionsMenu.vue'
import CommentTime from './CommentTime.vue'

const { thread } = defineProps<{ thread: CommentThread }>()

const comments = useComments()
const messages = useCommentMessages()
const common = useCommonMessages()
const menuCls = useMenuUI({ content: 'min-w-40' })
const replyText = ref('')

function sendReply() {
  comments.reply(thread.id, replyText.value)
  replyText.value = ''
}
</script>

<template>
  <div
    class="flex max-h-96 w-80 flex-col rounded-lg border border-border bg-panel text-xs text-surface shadow-xl"
    data-slot="comment-thread"
    :data-resolved="thread.resolved || undefined"
  >
    <div class="flex items-center gap-1 border-b border-border py-1 pr-1 pl-3">
      <span class="flex-1 truncate text-muted">
        {{ thread.nodeName ? messages.onLayer({ name: thread.nodeName }) : thread.pageName }}
      </span>
      <IconButton
        :label="thread.resolved ? messages.reopen : messages.resolve"
        :active="thread.resolved"
        data-command="comment-resolve"
        @click="comments.setResolved(thread.id, !thread.resolved)"
      >
        <icon-lucide-rotate-ccw v-if="thread.resolved" class="size-3.5" />
        <icon-lucide-circle-check v-else class="size-3.5" />
      </IconButton>
      <DropdownMenuRoot :modal="false">
        <DropdownMenuTrigger as-child>
          <IconButton :label="messages.moreActions">
            <icon-lucide-ellipsis class="size-3.5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent :class="menuCls.content" align="end" :side-offset="4">
            <CommentActionsMenu :thread="thread" kind="dropdown" />
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
      <IconButton :label="common.close" @click="comments.activeThreadId.value = null">
        <icon-lucide-x class="size-3.5" />
      </IconButton>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="font-semibold">{{ thread.author || messages.someone }}</span>
          <CommentTime :at="thread.createdAt" class="text-muted" />
          <span v-if="thread.resolved" class="ml-auto text-accent">{{ messages.resolved }}</span>
        </div>
        <p class="mt-1 break-words whitespace-pre-wrap">{{ thread.text }}</p>
      </div>
      <div
        v-for="entry in thread.replies.filter((item) => !item.deleted)"
        :key="entry.id"
        class="group"
        data-slot="comment-reply"
      >
        <div class="flex items-baseline gap-2">
          <span class="font-semibold">{{ entry.author || messages.someone }}</span>
          <CommentTime :at="entry.createdAt" class="text-muted" />
          <IconButton
            :label="messages.deleteReply"
            class="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            @click="comments.deleteReply(thread.id, entry.id)"
          >
            <icon-lucide-trash-2 class="size-3" />
          </IconButton>
        </div>
        <p class="mt-1 break-words whitespace-pre-wrap">{{ entry.text }}</p>
      </div>
    </div>

    <form class="flex flex-col gap-2 border-t border-border p-2" @submit.prevent="sendReply">
      <div class="flex gap-2">
        <AppInput
          v-model="replyText"
          size="sm"
          class="min-w-0 flex-1"
          :aria-label="messages.reply"
          :placeholder="messages.reply"
        />
        <AppButton type="submit" color="primary" variant="solid" :disabled="!replyText.trim()">
          {{ messages.send }}
        </AppButton>
      </div>
    </form>
  </div>
</template>
