import { expect, test } from '@playwright/test'

test('leaving Home Settings with unsaved edits asks first and keeps the edit', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 })
  await page.goto('/?recent-files')
  const home = page.getByTestId('recent-files-home')
  await expect(home).toBeVisible()
  const places = home.getByRole('navigation')

  await places.getByRole('button', { name: 'Settings', exact: true }).click()
  await home.getByRole('tab', { name: 'Storage', exact: true }).click()
  await home.getByRole('button', { name: /^S3 storage/ }).click()
  const bucket = home.getByRole('textbox', { name: 'Bucket' })
  await bucket.fill('draft-bucket')

  await places.getByRole('button', { name: 'Recent', exact: true }).click()
  const confirmation = page.getByRole('alertdialog')
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Keep editing' }).click()
  await expect(confirmation).toBeHidden()
  await expect(bucket).toHaveValue('draft-bucket')

  await places.getByRole('button', { name: 'Recent', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Discard' }).click()
  await expect(bucket).toBeHidden()
  await expect(places.getByRole('button', { name: 'Recent', exact: true })).toHaveAttribute(
    'data-active',
    'true'
  )
})

test('choosing the Settings place already shown does not ask', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 })
  await page.goto('/?recent-files')
  const home = page.getByTestId('recent-files-home')
  const places = home.getByRole('navigation')

  await places.getByRole('button', { name: 'Settings', exact: true }).click()
  await home.getByRole('tab', { name: 'Storage', exact: true }).click()
  await home.getByRole('button', { name: /^S3 storage/ }).click()
  const bucket = home.getByRole('textbox', { name: 'Bucket' })
  await bucket.fill('draft-bucket')

  await places.getByRole('button', { name: 'Settings', exact: true }).click()

  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(bucket).toHaveValue('draft-bucket')
})
