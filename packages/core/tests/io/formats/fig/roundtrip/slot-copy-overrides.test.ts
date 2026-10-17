import { beforeAll, describe, expect, test } from 'bun:test'

import { releaseFigPopulationWorker } from '#core/kiwi/fig/population/client'

import { expectDefined } from '#core-tests/helpers/assert'

import {
  exportFigFile,
  initCodec,
  parseFigFile,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/core'
import { createEditor } from '@open-pencil/core/editor'
import { parseFigBuffer } from '@open-pencil/fig'
import { createComponentPropertyId, slotPropertyId } from '@open-pencil/scene-graph'

interface SlotRecord {
  isSlotContent?: boolean
}

function find(graph: SceneGraph, root: string, name: string): SceneNode {
  const visit = (id: string): SceneNode | undefined => {
    for (const child of graph.getChildren(id)) {
      if (child.name === name) return child
      const found = visit(child.id)
      if (found) return found
    }
    return undefined
  }
  return expectDefined(visit(root))
}

const firstPage = (graph: SceneGraph) => expectDefined(graph.getPages().at(0)).id

async function reopen(graph: SceneGraph) {
  // Without its archive the export encodes every record, which is what this checks.
  releaseFigPopulationWorker(graph)
  const bytes = await exportFigFile(graph)
  return {
    reopened: await parseFigFile(bytes.slice().buffer),
    records: parseFigBuffer(bytes.slice().buffer).nodeChanges
  }
}

beforeAll(async () => {
  await initCodec()
})

describe('a copy of a component that holds an instance with slot content', () => {
  function authored(
    edit: (editor: ReturnType<typeof createEditor>, copy: SceneNode, slot: string) => void
  ) {
    const editor = createEditor()
    const { graph } = editor
    const page = editor.state.currentPageId
    const slot = createComponentPropertyId()
    const inner = graph.createNode('COMPONENT', page, {
      name: 'Inner',
      componentPropertyDefinitions: [{ id: slot, name: 'Body', type: 'SLOT', defaultValue: '' }]
    })
    graph.createNode('FRAME', inner.id, {
      name: 'Body',
      width: 200,
      height: 100,
      componentPropertyReferences: [{ propertyId: slot, field: 'SLOT_CONTENT' }]
    })
    const outer = graph.createNode('COMPONENT', page, { name: 'Outer', width: 300, height: 200 })
    const nested = expectDefined(graph.createInstance(inner.id, outer.id))
    const nestedSlot = expectDefined(
      graph.getChildren(nested.id).find((child) => slotPropertyId(child))
    )
    editor.createShape('RECTANGLE', 0, 0, 20, 20, nestedSlot.id, 'A')
    editor.createShape('RECTANGLE', 0, 0, 20, 20, nestedSlot.id, 'B')
    const copy = expectDefined(graph.createInstance(outer.id, page))
    copy.name = 'Copy'
    edit(editor, copy, slot)
    return graph
  }

  test('keeps a slot layer hidden and another recoloured in the copy', async () => {
    const red = {
      type: 'SOLID' as const,
      color: { r: 1, g: 0, b: 0, a: 1 },
      opacity: 1,
      visible: true,
      blendMode: 'NORMAL' as const
    }
    const graph = authored((editor, copy) => {
      editor.graph.updateNode(find(editor.graph, copy.id, 'A').id, { visible: false })
      editor.graph.updateNode(find(editor.graph, copy.id, 'B').id, { fills: [red] })
    })
    const { reopened } = await reopen(graph)
    const copy = find(reopened, firstPage(reopened), 'Copy')
    expect(find(reopened, copy.id, 'A').visible).toBe(false)
    expect(find(reopened, copy.id, 'B').visible).toBe(true)
    expect(find(reopened, copy.id, 'B').fills).toEqual([red])
    // The component's own slot content keeps its layers as they were.
    const outer = find(reopened, firstPage(reopened), 'Outer')
    expect(find(reopened, outer.id, 'A').visible).toBe(true)
    expect(find(reopened, outer.id, 'B').fills).not.toEqual([red])
  })

  test('writes no slot content for a copy that left the slot as it was', async () => {
    const { records } = await reopen(authored(() => undefined))
    // Outer's nested instance assigns the slot once; the untouched copy adds nothing.
    expect(records.filter((record) => (record as SlotRecord).isSlotContent)).toHaveLength(1)
  })

  test('writes no slot content for a copy whose nested instance was swapped but kept its slot', async () => {
    const { records } = await reopen(
      authored((editor, copy, slot) => {
        const page = editor.state.currentPageId
        const other = editor.graph.createNode('COMPONENT', page, {
          name: 'Other',
          componentPropertyDefinitions: [{ id: slot, name: 'Body', type: 'SLOT', defaultValue: '' }]
        })
        editor.graph.createNode('FRAME', other.id, {
          name: 'Body',
          width: 200,
          height: 100,
          componentPropertyReferences: [{ propertyId: slot, field: 'SLOT_CONTENT' }]
        })
        const nested = expectDefined(editor.graph.getChildren(copy.id).at(0))
        editor.graph.swapInstanceComponent(nested.id, other.id)
      })
    )
    expect(records.filter((record) => (record as SlotRecord).isSlotContent)).toHaveLength(1)
  })
})
