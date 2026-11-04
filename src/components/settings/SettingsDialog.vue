<script setup lang="ts">
import { DialogClose } from 'reka-ui'
import { useTemplateRef } from 'vue'

import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { settingsDialogOpen, settingsDialogSection } from '@/app/settings/dialog'
import SettingsBreadcrumb from '@/components/settings/layout/SettingsBreadcrumb.vue'
import SettingsWorkspace from '@/components/settings/SettingsWorkspace.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialogFooter, AppDialogHeader, AppDialogRoot } from '@/components/ui/dialog'

const { isMobile } = useViewportKind()
const { settings, common } = useI18n()
const workspace = useTemplateRef('workspace')

function onOpenChange(open: boolean): void {
  if (open) settingsDialogOpen.value = true
  else
    workspace.value?.request(
      () => {
        settingsDialogOpen.value = false
      },
      { closesWindow: true }
    )
}
</script>

<template>
  <AppDialogRoot
    :open="settingsDialogOpen"
    size="xl"
    :ui="{ content: 'w-[min(52.5rem,96vw)]' }"
    height="full"
    data-test-id="app-settings-dialog"
    @update:open="onOpenChange"
  >
    <AppDialogHeader
      :heading="settings.title"
      :description="settings.description"
      :close-label="common.close"
    >
      <!-- An open editor turns the title into the path back to where it was opened from. On a
           phone the section picker below already names the section, so the path starts at the
           list. -->
      <template v-if="workspace?.crumb" #title>
        <SettingsBreadcrumb
          :steps="isMobile ? [workspace.crumb.parent] : [settings.title, workspace.crumb.parent]"
          :current="workspace.crumb.title"
          @back="workspace.back()"
        />
      </template>
    </AppDialogHeader>

    <SettingsWorkspace ref="workspace" v-model:section="settingsDialogSection" answer-navigation />

    <AppDialogFooter v-if="!workspace?.editing">
      <DialogClose as-child>
        <AppButton color="primary" variant="solid" data-test-id="app-settings-done">
          {{ common.done }}
        </AppButton>
      </DialogClose>
    </AppDialogFooter>
  </AppDialogRoot>
</template>
