<script setup lang="ts">
import type { Color } from '@open-pencil/scene-graph/primitives'
import { useCommentMessages } from '@open-pencil/vue'

import MarkdownContent from '@/components/markdown/MarkdownContent.vue'
import PersonAvatar from '@/components/presence/PersonAvatar.vue'
import { PEER_COLORS } from '@/constants'
import { comments } from '@/theme/comments'

import CommentTime from './CommentTime.vue'

/** One message of a thread: who wrote it, when, and what. */
const { author, color, at, text } = defineProps<{
  author: string
  color?: Color
  at: string
  text: string
}>()

defineSlots<{ actions?(): unknown }>()

const messages = useCommentMessages()
const ui = comments()
</script>

<template>
  <article data-slot="comment-message" :class="ui.message()">
    <PersonAvatar :name="author || messages.someone" :color="color ?? PEER_COLORS[0]" />
    <div :class="ui.messageMeta()">
      <span :class="ui.messageAuthor()">{{ author || messages.someone }}</span>
      <CommentTime :at="at" :class="ui.messageTime()" />
      <span v-if="$slots.actions" :class="ui.messageActions()"><slot name="actions" /></span>
    </div>
    <MarkdownContent :content="text" :class="ui.messageText()" />
  </article>
</template>
