import { invoke } from '@tauri-apps/api/core'
import { computed, watch } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import { menuItemStates, type AppMenuContext } from '@/app/shell/menu/needs'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'
import { activeTab } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'

const store = useEditorStore()

const menuContext = computed<AppMenuContext>(() => ({
  // Home is a tab too, but it holds no document to act on.
  hasDocument: activeTab.value?.kind === 'document',
  hasSelection: store.state.selectedIds.size > 0
}))

/** The menu items the active tab cannot use yet: left out without a document, else greyed out. */
export const menuStates = computed(() => menuItemStates(APP_MENU_SCHEMA, menuContext.value))

/** Applies the same states to the desktop menu, which the in-app menu follows by itself. */
export function watchNativeMenuDisabled(): () => void {
  return watch(
    menuStates,
    ({ hidden, disabled }) => {
      if (!isTauri()) return
      invoke('set_native_menu_item_states', { hidden, disabled }).catch((error: unknown) => {
        console.warn('[Menu] Failed to update the native menu', error)
      })
    },
    { immediate: true }
  )
}
