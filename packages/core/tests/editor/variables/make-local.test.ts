import { describe, expect, test } from 'bun:test'

import { createEditor } from '#core/editor'

function libraryEditor() {
  const editor = createEditor()
  editor.graph.addCollection({
    id: 'tokens',
    name: 'Tokens',
    modes: [{ modeId: 'default', name: 'Default' }],
    defaultModeId: 'default',
    variableIds: [],
    key: 'library-key',
    version: '3'
  })
  editor.graph.addVariable({
    id: 'gap',
    name: 'Gap',
    type: 'FLOAT',
    collectionId: 'tokens',
    valuesByMode: { default: 8 },
    description: '',
    hiddenFromPublishing: false,
    key: 'gap-key',
    version: '3'
  })
  editor.graph.addVariable({
    id: 'gap-large',
    name: 'Gap large',
    type: 'FLOAT',
    collectionId: 'tokens',
    valuesByMode: { default: { aliasId: 'gap' } },
    description: '',
    hiddenFromPublishing: false
  })
  return editor
}

describe('make a library collection local', () => {
  test('drops the library keys and keeps the aliases', () => {
    const editor = libraryEditor()
    editor.makeCollectionLocal('tokens')
    const collection = editor.graph.variableCollections.get('tokens')
    expect(collection?.key).toBeUndefined()
    expect(collection?.version).toBeUndefined()
    expect(editor.graph.variables.get('gap')?.key).toBeUndefined()
    expect(editor.graph.variables.get('gap')?.version).toBeUndefined()
    expect(editor.graph.variables.get('gap-large')?.valuesByMode.default).toEqual({ aliasId: 'gap' })
    expect(editor.graph.resolveNumberVariable('gap-large')).toBe(8)
  })

  test('undo restores the keys and redo drops them again', () => {
    const editor = libraryEditor()
    editor.makeCollectionLocal('tokens')
    editor.undo.undo()
    expect(editor.graph.variableCollections.get('tokens')?.key).toBe('library-key')
    expect(editor.graph.variables.get('gap')?.key).toBe('gap-key')
    editor.undo.redo()
    expect(editor.graph.variableCollections.get('tokens')?.key).toBeUndefined()
  })

  test('a second call changes nothing, so one undo restores the keys', () => {
    const editor = libraryEditor()
    editor.makeCollectionLocal('tokens')
    editor.makeCollectionLocal('tokens')
    editor.undo.undo()
    expect(editor.graph.variableCollections.get('tokens')?.key).toBe('library-key')
  })

  test('an undo step does not touch a document that replaced the one it was made in', () => {
    const editor = libraryEditor()
    editor.makeCollectionLocal('tokens')
    const other = libraryEditor()
    other.makeCollectionLocal('tokens')
    const replacement = other.graph
    editor.replaceGraph(replacement)
    editor.undo.undo()
    expect(replacement.variableCollections.get('tokens')?.key).toBeUndefined()
    expect(replacement.variables.get('gap')?.key).toBeUndefined()
  })
})
