import { useEventListener } from '@vueuse/core'
import { watch } from 'vue'

import { activeStorageProviderID } from '@/app/integrations/storage'
import { appRuntimeConfig } from '@/app/runtime/config'
import { appPreferences, type StartupOpen } from '@/app/settings/preferences/store'
import { openFileFromPath } from '@/app/shell/menu/files'
import {
  allTabs,
  getActiveTabId,
  getTabsSnapshot,
  openStorageDocumentInNewTab,
  showNewTab,
  switchTab
} from '@/app/tabs'
import { describeOpenTabs, lastSession, restoreLastSession } from '@/app/tabs/open/last-session'
import { isTauri } from '@/app/tauri/env'

/** The start screen chosen in Settings, or the platform's default when none was chosen. */
export function startupOpenChoice(): StartupOpen {
  return (
    appPreferences.value.startup.open ??
    (isTauri() || appRuntimeConfig.recentFiles ? 'home' : 'new')
  )
}

/** Reopens the designs that were open last; shows the open screen when one cannot open. */
export async function reopenLastSession(): Promise<void> {
  const session = lastSession.value
  if (!session?.documents.length) return
  const allOpened = await restoreLastSession(session, {
    activeProviderId: activeStorageProviderID.value,
    async openPath(path) {
      if (!isTauri()) throw new Error('Files open by path only in the desktop app')
      await openFileFromPath(path)
    },
    openStorageDocument: openStorageDocumentInNewTab,
    activeTabId: getActiveTabId,
    focus: switchTab
  })
  if (!allOpened) showNewTab()
}

/** Keeps the list of open designs current so the next start can reopen them. */
export function recordOpenDocuments(ready: () => boolean): void {
  const record = () => {
    if (ready()) lastSession.value = describeOpenTabs(getTabsSnapshot(), getActiveTabId())
  }
  watch(allTabs, record)
  useEventListener(window, 'pagehide', record)
}
