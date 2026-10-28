import { computed, watch } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import { unmetMenuIds, type AppMenuContext } from '@/app/shell/menu/needs'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'
import { activeTab } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'

const store = useEditorStore()

const menuContext = computed<AppMenuContext>(() => ({
  // Home is a tab too, but it holds no document to act on.
  hasDocument: activeTab.value?.kind === 'document',
  hasSelection: store.state.selectedIds.size > 0
}))

/** The ids of the menu items that cannot act on the active tab yet. */
export const unmetMenuIdList = computed(() => unmetMenuIds(APP_MENU_SCHEMA, menuContext.value))

/** Greys out the same items in the desktop menu, which the in-app menu does by itself. */
export function watchNativeMenuDisabled(): () => void {
  return watch(
    unmetMenuIdList,
    (ids) => {
      if (!isTauri()) return
      void import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke('set_native_menu_disabled', { ids }))
        .catch((error: unknown) => {
          console.warn('[Menu] Failed to update the native menu', error)
        })
    },
    { immediate: true }
  )
}
