import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

test('shapes with text draw their kind with the label inside', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const solid = (r: number, g: number, b: number) => ({
      type: 'SOLID' as const,
      color: { r, g, b, a: 1 },
      visible: true,
      opacity: 1
    })
    const shapes = [
      ['SQUARE', 'Process'],
      ['DIAMOND', 'Paid?'],
      ['ENG_DATABASE', 'Orders'],
      ['DOCUMENT_MULTIPLE', 'Invoices'],
      ['ELLIPSE', 'Start'],
      ['PARALLELOGRAM_RIGHT', 'Read input'],
      ['ARROW_RIGHT', 'Next'],
      ['SPEECH_BUBBLE', 'Hello']
    ] as const
    shapes.forEach(([shapeWithTextType, text], index) => {
      const x = 40 + (index % 4) * 170
      const y = 40 + Math.floor(index / 4) * 140
      const id = store.createShape('SHAPE_WITH_TEXT', x, y, 150, 110)
      store.graph.updateNode(id, {
        name: text,
        shapeWithTextType,
        fills: [solid(0.86, 0.92, 1)],
        strokes: [{ ...solid(0.1, 0.12, 0.2), weight: 2, align: 'CENTER' as const }]
      })
      const [label] = store.graph.getChildren(id)
      // The label's own colour, as FigJam keeps it on the label layer.
      store.graph.updateNode(label.id, { text, fills: [solid(0.75, 0.1, 0.1)] })
      store.runLayoutForNode(id)
    })
    store.clearSelection()
    store.requestRender()
  })
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
  expect(await editor.canvas.screenshotCanvasRegion()).toMatchSnapshot('shapes-with-text.png')
})
