<script setup lang="ts">
import { tryOnScopeDispose } from '@vueuse/core'
import { AlertDialogCancel } from 'reka-ui'
import { computed, type Component } from 'vue'
import IconActivity from '~icons/lucide/activity'
import IconBell from '~icons/lucide/bell'
import IconBookOpen from '~icons/lucide/book-open'
import IconChartNoAxesCombined from '~icons/lucide/chart-no-axes-combined'
import IconCloud from '~icons/lucide/cloud'
import IconDatabase from '~icons/lucide/database'
import IconImage from '~icons/lucide/image'
import IconPenTool from '~icons/lucide/pen-tool'
import IconPlug from '~icons/lucide/plug'
import IconSettings from '~icons/lucide/settings'
import IconShield from '~icons/lucide/shield'
import IconSlidersHorizontal from '~icons/lucide/sliders-horizontal'
import IconSparkles from '~icons/lucide/sparkles'
import IconType from '~icons/lucide/type'

import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { CLOUD_INCLUDED } from '@/app/cloud/integration'
import { registerSettingsNavigation, type SettingsSection } from '@/app/settings/dialog'
import { provideSettingsNavigation } from '@/app/settings/navigation/use'
import { toast } from '@/app/shell/ui'
import { CloudSettingsSection } from '@/components/cloud/integration'
import ChatSettingsSection from '@/components/settings/chat/ChatSettingsSection.vue'
import DiagnosticsSettingsPanel from '@/components/settings/diagnostics/DiagnosticsSettingsPanel.vue'
import EditorSettingsPanel from '@/components/settings/editor/EditorSettingsPanel.vue'
import FontSettingsPanel from '@/components/settings/fonts/FontSettingsPanel.vue'
import GeneralSettingsPanel from '@/components/settings/general/GeneralSettingsPanel.vue'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import MCPWorkspacePanel from '@/components/settings/mcp/MCPWorkspacePanel.vue'
import MediaSettingsPanel from '@/components/settings/media/MediaSettingsPanel.vue'
import ModelsPanel from '@/components/settings/models/ModelsPanel.vue'
import NotificationSettingsSection from '@/components/settings/notifications/NotificationSettingsSection.vue'
import PrivacySettingsPanel from '@/components/settings/privacy/PrivacySettingsPanel.vue'
import SkillsSettingsPanel from '@/components/settings/skills/SkillsSettingsPanel.vue'
import StorageSettingsPanel from '@/components/settings/storage/StorageSettingsPanel.vue'
import ToolAccessSettingsPanel from '@/components/settings/tool-access/ToolAccessSettingsPanel.vue'
import UsageSettingsPanel from '@/components/settings/usage/UsageSettingsPanel.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppAlertDialogRoot, AppDialogFooter, AppDialogHeader } from '@/components/ui/dialog'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import {
  AppTabsContent,
  AppTabsHeading,
  AppTabsList,
  AppTabsRoot,
  AppTabsTrigger
} from '@/components/ui/tabs'

/**
 * The Settings sections and their panels, in the Settings window and on the Home tab. Leaving a
 * section that has unsaved edits asks first. Only the window answers `openSettingsDialog`'s
 * requests to leave; `answerNavigation` says this copy is that one.
 */
const { answerNavigation = false } = defineProps<{ answerNavigation?: boolean }>()
const section = defineModel<SettingsSection>('section', { required: true })

const { isMobile } = useViewportKind()
const { settings } = useI18n()
const navigation = provideSettingsNavigation({
  onBusy: () => toast.info(settings.value.saveInProgress)
})
if (answerNavigation) tryOnScopeDispose(registerSettingsNavigation(navigation.request))
const { editing, confirming, crumb } = navigation

interface SectionItem {
  value: SettingsSection
  label: string
  icon: Component
}

/** The sidebar's pages, grouped as macOS and VS Code group their settings. */
const groups = computed<{ label: string; sections: SectionItem[] }[]>(() => [
  {
    label: settings.value.groupApp,
    sections: [
      { value: 'general', label: settings.value.general, icon: IconSettings },
      { value: 'editor', label: settings.value.editor, icon: IconPenTool },
      { value: 'fonts', label: settings.value.fonts, icon: IconType },
      { value: 'storage', label: settings.value.storage, icon: IconDatabase },
      { value: 'notifications', label: settings.value.notifications, icon: IconBell },
      ...(CLOUD_INCLUDED
        ? [{ value: 'cloud' as const, label: settings.value.cloud, icon: IconCloud }]
        : [])
    ]
  },
  {
    label: settings.value.groupAI,
    sections: [
      { value: 'ai', label: settings.value.models, icon: IconSparkles },
      { value: 'tools', label: settings.value.toolAccess, icon: IconSlidersHorizontal },
      { value: 'skills', label: settings.value.skills, icon: IconBookOpen },
      { value: 'services', label: settings.value.imageServices, icon: IconImage },
      { value: 'mcp', label: settings.value.mcp, icon: IconPlug },
      { value: 'usage', label: settings.value.usage, icon: IconChartNoAxesCombined }
    ]
  },
  {
    label: settings.value.groupDataAndPrivacy,
    sections: [
      { value: 'privacy', label: settings.value.privacy, icon: IconShield },
      { value: 'diagnostics', label: settings.value.diagnostics, icon: IconActivity }
    ]
  }
])
const sections = computed(() => groups.value.flatMap((group) => group.sections))
const selectGroups = computed(() =>
  groups.value.map((group) => ({
    label: group.label,
    options: group.sections.map(({ value, label }) => ({ value, label }))
  }))
)
function onSectionChange(next: string | number): void {
  const match = sections.value.find((item) => item.value === next)
  if (!match || match.value === section.value) return
  navigation.request(() => {
    section.value = match.value
  })
}
/** The page an editor was opened from, picked again in the sidebar, leads back to its list. */
function onTriggerClick(picked: string): void {
  if (picked === section.value && editing.value) navigation.back()
}

defineExpose({ editing, crumb, request: navigation.request, back: navigation.back })
</script>

<template>
  <AppTabsRoot
    :model-value="section"
    @update:model-value="onSectionChange"
    :orientation="isMobile ? 'horizontal' : 'vertical'"
  >
    <div v-if="isMobile" class="shrink-0 border-b border-border p-3">
      <AppSelect
        :model-value="section"
        :groups="selectGroups"
        :label="settings.title"
        :ui="{ trigger: 'w-full' }"
        @update:model-value="onSectionChange"
      />
    </div>
    <AppTabsList v-show="!isMobile" :label="settings.title">
      <template v-for="group in groups" :key="group.label">
        <AppTabsHeading>{{ group.label }}</AppTabsHeading>
        <AppTabsTrigger
          v-for="item in group.sections"
          :key="item.value"
          :value="item.value"
          :data-test-id="`settings-section-${item.value}`"
          @click="onTriggerClick(item.value)"
        >
          <template #leading><component :is="item.icon" class="size-3.5" /></template>
          {{ item.label }}
        </AppTabsTrigger>
      </template>
    </AppTabsList>

    <AppTabsContent value="general" as-child>
      <SettingsPage><GeneralSettingsPanel /></SettingsPage>
    </AppTabsContent>
    <AppTabsContent value="editor" as-child>
      <EditorSettingsPanel />
    </AppTabsContent>
    <AppTabsContent value="fonts" as-child>
      <FontSettingsPanel />
    </AppTabsContent>
    <AppTabsContent value="storage" as-child>
      <StorageSettingsPanel />
    </AppTabsContent>
    <AppTabsContent value="notifications" as-child>
      <SettingsPage><NotificationSettingsSection /></SettingsPage>
    </AppTabsContent>
    <AppTabsContent v-if="CLOUD_INCLUDED" value="cloud" as-child>
      <CloudSettingsSection />
    </AppTabsContent>
    <AppTabsContent value="ai" as-child>
      <section class="flex min-h-0 min-w-0 flex-1 flex-col" data-test-id="settings-ai-panel">
        <ModelsPanel>
          <ChatSettingsSection />
        </ModelsPanel>
      </section>
    </AppTabsContent>
    <AppTabsContent value="tools" as-child>
      <ToolAccessSettingsPanel target="ai" />
    </AppTabsContent>
    <AppTabsContent value="skills" as-child>
      <SkillsSettingsPanel />
    </AppTabsContent>
    <AppTabsContent value="services" as-child>
      <MediaSettingsPanel />
    </AppTabsContent>
    <AppTabsContent value="mcp" as-child>
      <MCPWorkspacePanel />
    </AppTabsContent>
    <AppTabsContent value="usage" as-child>
      <SettingsPage><UsageSettingsPanel /></SettingsPage>
    </AppTabsContent>
    <AppTabsContent value="privacy" as-child>
      <SettingsPage><PrivacySettingsPanel /></SettingsPage>
    </AppTabsContent>
    <AppTabsContent value="diagnostics" as-child>
      <SettingsPage><DiagnosticsSettingsPanel /></SettingsPage>
    </AppTabsContent>
  </AppTabsRoot>

  <AppAlertDialogRoot :open="confirming" @update:open="!$event && navigation.keepEditing()">
    <AppDialogHeader
      :heading="settings.discardChanges"
      :description="settings.discardChangesDescription"
      :show-close="false"
    />
    <AppDialogFooter>
      <AlertDialogCancel as-child
        ><AppButton>{{ settings.keepEditing }}</AppButton></AlertDialogCancel
      >
      <AppButton color="error" variant="solid" @click="navigation.discard">{{
        settings.discard
      }}</AppButton>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
