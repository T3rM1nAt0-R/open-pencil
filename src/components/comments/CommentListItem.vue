<script setup lang="ts">
import { uniqBy } from 'es-toolkit'
import { computed } from 'vue'

import type { CommentThread } from '@open-pencil/scene-graph'
import { useCommentMessages } from '@open-pencil/vue'

import { commentPreview } from '@/app/comments/format'
import AvatarStack from '@/components/presence/AvatarStack.vue'
import type { PresencePersonRow } from '@/components/presence/rows'
import { PEER_COLORS } from '@/constants'
import { comments } from '@/theme/comments'

import CommentTime from './CommentTime.vue'

/** A thread in the comments list: who took part, where it is, and how it starts. */
const {
  thread,
  number,
  pageName = '',
  active = false
} = defineProps<{
  thread: CommentThread
  /** Its place among the document's threads, as Figma numbers them. */
  number: number
  pageName?: string
  active?: boolean
}>()

defineSlots<{ actions?(): unknown }>()

const messages = useCommentMessages()
const ui = comments()

const replies = computed(() => thread.replies.filter((entry) => !entry.deleted))
// Everyone in the thread, first to speak first; the stack keys them by position.
const people = computed<PresencePersonRow[]>(() =>
  uniqBy([thread, ...replies.value], (entry) => entry.author).map((entry, index) => ({
    clientId: index,
    name: entry.author || messages.value.someone,
    color: entry.authorColor ?? PEER_COLORS[0],
    agents: []
  }))
)
</script>

<template>
  <li
    data-slot="comment-list-item"
    :data-active="active || undefined"
    :data-resolved="thread.resolved || undefined"
    :class="ui.item()"
    tabindex="0"
  >
    <div :class="ui.itemTop()">
      <AvatarStack
        :people="people"
        :max="3"
        :label="people.map((person) => person.name).join(', ')"
      />
      <span :class="ui.itemPlace()">#{{ number }} · {{ pageName }}</span>
    </div>
    <div :class="ui.itemMeta()">
      <span :class="ui.messageAuthor()">{{ thread.author || messages.someone }}</span>
      <CommentTime :at="thread.createdAt" :class="ui.messageTime()" />
    </div>
    <p :class="ui.itemText()">{{ commentPreview(thread.text) }}</p>
    <span v-if="replies.length" :class="ui.itemReplies()">
      {{ messages.replyCount({ count: replies.length }) }}
    </span>
    <span v-if="$slots.actions" :class="ui.itemActions()" @click.stop><slot name="actions" /></span>
  </li>
</template>
