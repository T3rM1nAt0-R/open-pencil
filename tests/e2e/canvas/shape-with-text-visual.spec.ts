import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

test('shapes with text draw their kind with the label inside', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const pageId = store.state.currentPageId
    const solid = (r: number, g: number, b: number) => ({
      type: 'SOLID' as const,
      color: { r, g, b, a: 1 },
      visible: true,
      opacity: 1
    })
    const outline = [{ ...solid(0.1, 0.12, 0.2), weight: 2, align: 'CENTER' as const }]
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
      store.graph.createNode('SHAPE_WITH_TEXT', pageId, {
        name: text,
        x: 40 + (index % 4) * 170,
        y: 40 + Math.floor(index / 4) * 140,
        width: 150,
        height: 110,
        shapeWithTextType,
        text,
        fontSize: 16,
        textAlignHorizontal: 'CENTER',
        fills: [solid(0.86, 0.92, 1)],
        strokes: outline,
        // The label's own colour, kept per character as FigJam keeps it.
        styleRuns: [{ start: 0, length: text.length, style: { fills: [solid(0.75, 0.1, 0.1)] } }]
      })
    })
    store.clearSelection()
    store.requestRender()
  })
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
  expect(await editor.canvas.screenshotCanvasRegion()).toMatchSnapshot('shapes-with-text.png')
})
