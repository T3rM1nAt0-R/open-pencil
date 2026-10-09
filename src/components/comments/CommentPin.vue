<script setup lang="ts">
import type { Color } from '@open-pencil/scene-graph/primitives'

import PersonAvatar from '@/components/presence/PersonAvatar.vue'
import { PEER_COLORS } from '@/constants'
import { comments } from '@/theme/comments'

/** A comment on the canvas: its author's avatar in a bubble pointing at the spot. */
const {
  author = '',
  color,
  active = false,
  resolved = false,
  draft = false
} = defineProps<{
  author?: string
  color?: Color
  active?: boolean
  resolved?: boolean
  /** A comment still being written: an empty bubble, as Figma draws it. */
  draft?: boolean
}>()

const ui = comments()
</script>

<template>
  <button
    type="button"
    data-slot="comment-pin"
    :data-active="active || undefined"
    :data-resolved="resolved || undefined"
    :data-draft="draft || undefined"
    :class="ui.pin()"
  >
    <PersonAvatar v-if="!draft" :name="author" :color="color ?? PEER_COLORS[0]" />
  </button>
</template>
