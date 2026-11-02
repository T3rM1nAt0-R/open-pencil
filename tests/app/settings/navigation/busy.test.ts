import { describe, expect, mock, test } from 'bun:test'

import { ref } from 'vue'

import { createSettingsNavigation } from '@/app/settings/navigation/use'

function busyForm() {
  return { dirty: ref(true), busy: ref(true), cancel: mock(() => undefined) }
}

describe('Settings navigation while a form is saving', () => {
  test('tells the person the request was held instead of dropping it silently', () => {
    const onBusy = mock(() => undefined)
    const navigation = createSettingsNavigation({ onBusy })
    navigation.register(busyForm())
    const action = mock(() => undefined)

    navigation.request(action)

    expect(action).not.toHaveBeenCalled()
    expect(onBusy).toHaveBeenCalledTimes(1)
  })

  test('says nothing when the form is not saving', () => {
    const onBusy = mock(() => undefined)
    const navigation = createSettingsNavigation({ onBusy })
    const form = busyForm()
    form.busy.value = false
    form.dirty.value = false
    navigation.register(form)
    const action = mock(() => undefined)

    navigation.request(action)

    expect(action).toHaveBeenCalledTimes(1)
    expect(onBusy).not.toHaveBeenCalled()
  })
})
