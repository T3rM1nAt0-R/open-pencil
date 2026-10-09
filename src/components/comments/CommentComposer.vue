<script setup lang="ts">
import { useTextareaAutosize } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'

import { useCommentMessages } from '@open-pencil/vue'

import AppButton from '@/components/ui/button/AppButton.vue'
import { comments } from '@/theme/comments'

/** Where a comment or reply is written: Enter sends, Shift+Enter starts a new line. */
const { label } = defineProps<{ label: string }>()

const emit = defineEmits<{ submit: [text: string]; cancel: [] }>()

const text = defineModel<string>({ default: '' })
const input = useTemplateRef<HTMLTextAreaElement>('input')
useTextareaAutosize({ element: input, input: text })

const messages = useCommentMessages()
const ui = comments()
const empty = computed(() => text.value.trim() === '')

function submit() {
  if (empty.value) return
  emit('submit', text.value.trim())
}

function focus() {
  input.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <form data-slot="comment-composer" :class="ui.composer()" @submit.prevent="submit">
    <textarea
      ref="input"
      v-model="text"
      rows="1"
      :aria-label="label"
      :placeholder="label"
      :class="ui.composerInput()"
      @keydown.enter.exact.prevent="submit"
      @keydown.escape.stop.prevent="emit('cancel')"
    />
    <div :class="ui.composerBar()">
      <AppButton
        type="submit"
        color="primary"
        variant="solid"
        shape="pill"
        size="xs"
        :disabled="empty"
        :aria-label="messages.send"
        :ui="{ base: 'size-6 px-0' }"
      >
        <icon-lucide-arrow-up class="size-3.5" />
      </AppButton>
    </div>
  </form>
</template>
