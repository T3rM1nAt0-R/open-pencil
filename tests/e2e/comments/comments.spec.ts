import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'

const editor = useEditorSetup()

const pins = () => editor.page.locator('[data-slot="comment-pin"]')
const capture = () => editor.page.locator('[data-slot="comments-capture"]')
const panel = () => editor.page.locator('[data-slot="comments-panel"]')
const items = () => panel().locator('[data-slot="comments-panel-item"]')

async function placeComment(x: number, y: number, text: string) {
  const box = expectDefined(await editor.canvas.canvas.boundingBox(), 'canvas bounds')
  await editor.page.mouse.click(box.x + x, box.y + y)
  const draft = editor.page.locator('[data-slot="comment-draft"]')
  const name = draft.getByRole('textbox').first()
  if ((await draft.getByRole('textbox').count()) > 1) await name.fill('Tester')
  await draft.locator('textarea').fill(text)
  await editor.page.keyboard.press('Enter')
}

test('C enters comment mode and a click on the canvas leaves a pin', async () => {
  await editor.canvas.drawRect(100, 100, 200, 150)
  await editor.page.keyboard.press('KeyC')
  await expect(capture()).toHaveCount(1)
  await expect(panel()).toHaveCount(0)
  await placeComment(150, 150, 'first note')
  await expect(pins()).toHaveCount(1)
  await editor.page.keyboard.press('Escape')
  await editor.page.keyboard.press('Escape')
  await expect(capture()).toHaveCount(0)
})

test('the toolbar comment tool and other tools switch comment mode', async () => {
  await editor.page.locator('[data-command="comment-tool"]').click()
  await expect(capture()).toHaveCount(1)
  await placeComment(250, 200, 'second note')
  await expect(pins()).toHaveCount(2)
  await editor.page.keyboard.press('Escape')
  await editor.page.keyboard.press('KeyV')
  await expect(capture()).toHaveCount(0)
})

test('the comments button only opens and closes the list', async () => {
  const toggle = editor.page.locator('[data-slot="comments-panel-toggle"]')
  await toggle.click()
  await expect(panel()).toHaveCount(1)
  await expect(capture()).toHaveCount(0)
  await expect(items()).toHaveCount(2)
  await toggle.click()
  await expect(panel()).toHaveCount(0)
})

test('the list searches and resolves comments', async () => {
  await editor.page.locator('[data-slot="comments-panel-toggle"]').click()
  await panel().getByRole('searchbox').fill('second')
  await expect(items()).toHaveCount(1)
  await panel().getByRole('searchbox').fill('')
  await expect(items()).toHaveCount(2)

  await items().first().hover()
  await items().first().locator('[data-command="comment-resolve"]').click()
  await expect(items()).toHaveCount(1)
  await expect(pins()).toHaveCount(1)
  await panel().getByRole('tab').nth(1).click()
  await expect(items()).toHaveCount(1)
  await panel().getByRole('tab').first().click()
})

test('right-clicking a pin opens comment actions, not the canvas menu', async () => {
  await pins().first().click({ button: 'right' })
  const menu = editor.page.getByRole('menu')
  await expect(menu.locator('[data-command="comment-resolve"]')).toHaveCount(1)
  await expect(menu.getByTestId('context-duplicate')).toHaveCount(0)
  await menu.locator('[data-command="comment-delete"]').click()
  await editor.page.getByRole('alertdialog').getByRole('button').last().click()
  await expect(pins()).toHaveCount(0)
})
