<script setup lang="ts">
import {
  ContextMenuContent,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed } from 'vue'

import { useCommentMessages, useCommonMessages } from '@open-pencil/vue'

import { listThreads } from '@/app/comments/list'
import { formatCommentTime } from '@/app/comments/time'
import { useComments } from '@/app/comments/use'
import { useEditorStore } from '@/app/editor/active-store'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import AppTabsList from '@/components/ui/tabs/AppTabsList.vue'
import AppTabsRoot from '@/components/ui/tabs/AppTabsRoot.vue'
import AppTabsTrigger from '@/components/ui/tabs/AppTabsTrigger.vue'

import CommentActionsMenu from './CommentActionsMenu.vue'

const store = useEditorStore()
const comments = useComments()
const messages = useCommentMessages()
const common = useCommonMessages()
const menuCls = useMenuUI({ content: 'min-w-44', item: 'justify-start gap-2' })
const { listTab, listQuery, listScope, listSort, listOnlyMine, status, errorMessage, backend } =
  comments

const listed = computed(() =>
  listThreads(comments.threads.value, {
    tab: listTab.value,
    query: listQuery.value,
    scope: listScope.value,
    pageId: store.state.currentPageId,
    onlyMine: listOnlyMine.value,
    author: comments.author.value,
    sort: listSort.value
  })
)

const filtered = computed(
  () => listQuery.value.trim() !== '' || listOnlyMine.value || listScope.value === 'page'
)

const emptyText = computed(() => {
  if (filtered.value) return messages.value.noMatches
  return listTab.value === 'open' ? messages.value.emptyOpen : messages.value.emptyResolved
})

const syncText = computed(() => {
  if (status.value === 'error') {
    return messages.value.syncFailed({ error: errorMessage.value ?? '' })
  }
  if (status.value === 'saving') return messages.value.saving
  if (status.value === 'loading') return messages.value.loading
  return backend.value?.shared ? messages.value.savedShared : messages.value.savedLocal
})

function replyCount(threadId: string) {
  const thread = comments.threads.value.find((entry) => entry.id === threadId)
  return thread?.replies.filter((entry) => !entry.deleted).length ?? 0
}

function pageName(pageId: string, fallback?: string) {
  return store.graph.getNode(pageId)?.name ?? fallback ?? ''
}

function setScope(value: unknown) {
  if (value === 'page' || value === 'all') listScope.value = value
}

function setSort(value: unknown) {
  if (value === 'newest' || value === 'oldest') listSort.value = value
}
</script>

<template>
  <section
    class="flex max-h-[70vh] w-80 flex-col rounded-lg border border-border bg-panel text-xs text-surface shadow-xl"
    :aria-label="messages.comments"
    data-slot="comments-panel"
  >
    <header class="flex items-center gap-1 border-b border-border py-1 pr-1 pl-3">
      <h2 class="flex-1 font-semibold">{{ messages.comments }}</h2>
      <IconButton :label="messages.checkNow" @click="comments.refresh()">
        <icon-lucide-refresh-cw class="size-3.5" />
      </IconButton>
      <DropdownMenuRoot :modal="false">
        <DropdownMenuTrigger as-child>
          <IconButton :label="messages.filterAndSort" :active="filtered">
            <icon-lucide-list-filter class="size-3.5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent :class="menuCls.content" align="end" :side-offset="4">
            <DropdownMenuRadioGroup :model-value="listScope" @update:model-value="setScope">
              <DropdownMenuRadioItem value="page" :class="menuCls.item">
                <DropdownMenuItemIndicator class="w-3" force-mount>
                  <icon-lucide-check v-if="listScope === 'page'" class="size-3" />
                </DropdownMenuItemIndicator>
                {{ messages.thisPage }}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="all" :class="menuCls.item">
                <DropdownMenuItemIndicator class="w-3" force-mount>
                  <icon-lucide-check v-if="listScope === 'all'" class="size-3" />
                </DropdownMenuItemIndicator>
                {{ messages.allPages }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator :class="menuCls.separator" />
            <DropdownMenuCheckboxItem v-model="listOnlyMine" :class="menuCls.item">
              <DropdownMenuItemIndicator class="w-3" force-mount>
                <icon-lucide-check v-if="listOnlyMine" class="size-3" />
              </DropdownMenuItemIndicator>
              {{ messages.onlyMine }}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator :class="menuCls.separator" />
            <DropdownMenuRadioGroup :model-value="listSort" @update:model-value="setSort">
              <DropdownMenuRadioItem value="newest" :class="menuCls.item">
                <DropdownMenuItemIndicator class="w-3" force-mount>
                  <icon-lucide-check v-if="listSort === 'newest'" class="size-3" />
                </DropdownMenuItemIndicator>
                {{ messages.newestFirst }}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest" :class="menuCls.item">
                <DropdownMenuItemIndicator class="w-3" force-mount>
                  <icon-lucide-check v-if="listSort === 'oldest'" class="size-3" />
                </DropdownMenuItemIndicator>
                {{ messages.oldestFirst }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
      <IconButton :label="common.close" @click="comments.panelOpen.value = false">
        <icon-lucide-x class="size-3.5" />
      </IconButton>
    </header>

    <div class="flex flex-col gap-2 border-b border-border px-3 py-2">
      <AppTabsRoot v-model="listTab">
        <AppTabsList :label="messages.comments">
          <AppTabsTrigger value="open">
            {{ messages.open }} · {{ comments.openCount.value }}
          </AppTabsTrigger>
          <AppTabsTrigger value="resolved">
            {{ messages.resolved }} · {{ comments.resolvedCount.value }}
          </AppTabsTrigger>
        </AppTabsList>
      </AppTabsRoot>
      <AppInput
        v-model="listQuery"
        type="search"
        size="sm"
        :aria-label="messages.searchComments"
        :placeholder="messages.searchComments"
      >
        <template #leading><icon-lucide-search class="size-3.5" /></template>
      </AppInput>
    </div>

    <ul class="min-h-0 flex-1 overflow-y-auto">
      <li v-if="listed.length === 0" class="px-3 py-4 text-muted">{{ emptyText }}</li>
      <ContextMenuRoot v-for="thread in listed" :key="thread.id" :modal="false">
        <ContextMenuTrigger as-child>
          <li
            class="group relative flex cursor-pointer flex-col gap-1 border-b border-border px-3 py-2 hover:bg-hover data-[active]:bg-hover"
            :data-active="comments.activeThreadId.value === thread.id || undefined"
            data-slot="comments-panel-item"
            @click="comments.focusThread(store, thread.id)"
          >
            <span class="flex items-baseline gap-2 pr-14">
              <span class="truncate font-semibold">{{ thread.author || messages.someone }}</span>
              <span class="shrink-0 text-muted">{{ formatCommentTime(thread.updatedAt) }}</span>
            </span>
            <span class="line-clamp-2 break-words">{{ thread.text }}</span>
            <span class="text-muted">
              {{ pageName(thread.pageId, thread.pageName) }}
              <template v-if="replyCount(thread.id)">
                · {{ messages.replyCount({ count: replyCount(thread.id) }) }}
              </template>
            </span>
            <span
              class="absolute top-1.5 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              @click.stop
            >
              <IconButton
                :label="thread.resolved ? messages.reopen : messages.resolve"
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
                    <CommentActionsMenu :thread="thread" kind="dropdown" show-go-to />
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenuRoot>
            </span>
          </li>
        </ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent :class="menuCls.content">
            <CommentActionsMenu :thread="thread" kind="context" show-go-to />
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenuRoot>
    </ul>

    <p
      class="border-t border-border px-3 py-2 text-muted data-[error]:text-danger"
      :data-error="status === 'error' || undefined"
    >
      {{ syncText }}
    </p>
  </section>
</template>
