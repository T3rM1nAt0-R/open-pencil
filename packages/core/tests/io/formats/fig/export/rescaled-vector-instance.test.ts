import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@open-pencil/core/editor'
import { FigmaAPI } from '@open-pencil/core/figma-api'
import { exportFigFile, renderNodesToSVG } from '@open-pencil/core/io'
import { initCodec } from '@open-pencil/core/kiwi'
import { materializeDocument, parseFigBuffer } from '@open-pencil/fig'
import { SceneGraph } from '@open-pencil/scene-graph'

async function rescaledInstance(regionFills: boolean) {
  const graph = new SceneGraph()
  createEditor({ graph })
  const api = new FigmaAPI(graph)
  const component = api.createComponent()
  component.resize(24, 24)
  const vector = api.createVector()
  component.appendChild(vector)
  vector.x = 2
  vector.y = 2
  vector.resize(20, 20)
  await vector.setVectorNetworkAsync({
    vertices: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 }
    ],
    segments: [0, 1, 2, 3].map((i) => ({ start: i, end: (i + 1) % 4 })),
    regions: [
      { windingRule: 'NONZERO', loops: [[0, 1, 2, 3]], ...(regionFills ? { fills: [] } : {}) }
    ]
  } as never)
  const instance = component.createInstance()
  instance.rescale(16 / 24)

  await initCodec()
  const bytes = await exportFigFile(graph)
  const parsed = parseFigBuffer(bytes.slice().buffer as ArrayBuffer)
  const reopened = materializeDocument(parsed.nodeChanges, parsed.blobs, { derivedBounds: true })
  const reopenedInstance = expectDefined(
    [...reopened.graph.nodes.values()].find((node) => node.type === 'INSTANCE')
  )
  const page = expectDefined(reopened.graph.getPages()[0])
  return expectDefined(renderNodesToSVG(reopened.graph, page.id, [reopenedInstance.id]))
}

for (const regionFills of [false, true]) {
  test(`a rescaled instance keeps its vector at the instance size after reopening (region fills: ${regionFills})`, async () => {
    const svg = await rescaledInstance(regionFills)
    expect(svg).toContain('L13.33 0L13.33 13.33')
    expect(svg).not.toContain('L20 0')
  })
}
