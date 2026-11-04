import { useEventListener } from '@vueuse/core'
import { computed, watch } from 'vue'

import { joinRoom, roomForStore } from '@/app/collab/rooms'
import { createStorageAdapter } from '@/app/integrations/storage'
import { appPreferences, type StartupOpen } from '@/app/settings/preferences/store'
import { openFileFromPath } from '@/app/shell/menu/files'
import { toast } from '@/app/shell/ui'
import {
  allTabs,
  getActiveTabId,
  getTabsSnapshot,
  openStorageDocumentInNewTab,
  showNewTab,
  switchTab
} from '@/app/tabs'
import {
  describeOpenTabs,
  lastSession,
  restoreLastSession,
  storedDocumentMetadata
} from '@/app/tabs/open/last-session'
import { IS_TAURI } from '@/constants'

/** The start screen chosen in Settings; reopening the last designs when none was chosen. */
export function startupOpenChoice(): StartupOpen {
  return appPreferences.value.startup.open ?? 'reopen'
}

/** Reopens the designs that were open last; shows the open screen when one cannot open. */
export async function reopenLastSession(messages: {
  sharedFile: string
  reopenIncomplete: string
}): Promise<void> {
  const session = lastSession.value
  if (!session?.documents.length) return
  const outcome = await restoreLastSession(session, {
    async openPath(path) {
      if (!IS_TAURI) throw new Error('Files open by path only in the desktop app')
      await openFileFromPath(path)
    },
    joinRoom: (roomId) => joinRoom(roomId, { tabName: messages.sharedFile }) !== null,
    storageMetadata: (documentId, location) =>
      storedDocumentMetadata(createStorageAdapter(location), documentId),
    async openStorageDocument(document, location) {
      await openStorageDocumentInNewTab(document, location)
    },
    activeTabId: getActiveTabId,
    focus: switchTab,
    showHome: showNewTab
  })
  if (outcome === 'all') return
  toast.info(messages.reopenIncomplete)
  // Home waits only when nothing came back; a design that reopened stays in front.
  if (outcome === 'none') showNewTab()
}

/**
 * Keeps the list of open designs current so the next start can reopen them, and returns a
 * function that records them right away.
 */
export function recordOpenDocuments(ready: () => boolean): () => void {
  const record = () => {
    if (!ready()) return
    const tabs = getTabsSnapshot().map((tab) => {
      const room = roomForStore(tab.store)
      return { ...tab, roomId: room?.origin === 'joined' ? room.roomId : null }
    })
    lastSession.value = describeOpenTabs(tabs, getActiveTabId())
  }
  // Saving a design to a file or to storage changes where it lives without touching the tab list.
  const sources = computed(() =>
    getTabsSnapshot().map((tab) => [
      tab.store.getSourceIdentity().path,
      tab.store.getStorageBinding()?.documentId
    ])
  )
  watch([allTabs, sources], record)
  useEventListener(window, 'pagehide', record)
  return record
}
