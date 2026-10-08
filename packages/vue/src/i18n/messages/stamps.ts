import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const stampMessageDefaults = {
  stamp: 'Stamp',
  built: 'Built',
  beingBuilt: 'Being built',
  planned: 'Planned',
  removeStamp: 'Remove stamp',
  selectToStamp: 'Select a screen to stamp it',
  stampSelected: params('Stamp selected screens: {count}')
} as const

export const stampMessages = i18n('stamps', stampMessageDefaults)
