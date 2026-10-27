import type { Router } from 'vue-router'

import { homeLocation, whenHomeMayChange, type HomeLocation } from '@/app/home/location'
import { activeStorageProviderID, storagePreferencesComplete } from '@/app/integrations/storage'

function showHome(router: Router): void {
  void router
    .push('/')
    .then(() => import('@/app/tabs'))
    .then(({ showNewTab }) => showNewTab())
}

/** Shows Home at one of its places, in a new tab when a document is open. */
export function openHomeLocation(router: Router, location: HomeLocation): void {
  whenHomeMayChange(() => {
    homeLocation.value = location
    showHome(router)
  })
}

/** Home on the storage bucket when one is set up, else where the person browsed last (never Settings). */
export function browseFiles(router: Router): void {
  const bucketReady = storagePreferencesComplete(activeStorageProviderID.value)
  const last = homeLocation.value
  const fallback: HomeLocation = last.kind === 'settings' ? { kind: 'recent' } : last
  openHomeLocation(router, bucketReady ? { kind: 'storage' } : fallback)
}
