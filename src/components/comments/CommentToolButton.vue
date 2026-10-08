<script setup lang="ts">
import IconMessageCirclePlus from '~icons/lucide/message-circle-plus'

import { useCommentMessages } from '@open-pencil/vue'

import { useComments } from '@/app/comments/use'
import ToolButton from '@/components/Toolbar/ToolButton.vue'
import type { ToolbarUI } from '@/components/Toolbar/types'
import Tip from '@/components/ui/overlay/Tip.vue'

const { ui } = defineProps<{ ui?: ToolbarUI }>()

const comments = useComments()
const messages = useCommentMessages()
</script>

<template>
  <Tip :label="`${messages.comment} (C)`">
    <ToolButton
      data-command="comment-tool"
      :icon="IconMessageCirclePlus"
      :label="messages.comment"
      :active="comments.commenting.value"
      :ui="ui"
      @click="comments.toggleCommenting()"
    />
  </Tip>
</template>
