import { expect, test } from '@playwright/test'

const settingsNote = '[data-slot="update-prompt"] [data-slot="update-settings-note"]'

function story(name: string) {
  return `/iframe.html?id=app-shell-update-prompt--${name}&viewMode=story`
}

for (const name of ['available', 'available-on-windows', 'downloading', 'download-failed']) {
  test(`${name}: the update says it keeps settings and storage profiles`, async ({ page }) => {
    await page.goto(story(name))

    await expect(page.locator(settingsNote)).toBeVisible()
  })
}

for (const name of ['installed', 'checking', 'up-to-date']) {
  test(`${name}: there is no update to promise anything about`, async ({ page }) => {
    await page.goto(story(name))

    await expect(page.locator('[data-slot="update-prompt"]')).toBeVisible()
    await expect(page.locator(settingsNote)).toHaveCount(0)
  })
}
