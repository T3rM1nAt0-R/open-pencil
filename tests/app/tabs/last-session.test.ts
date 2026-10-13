import { describe, expect, test } from 'bun:test'

import type { StorageDocument } from '@/app/integrations/storage'
import {
  describeOpenTabs,
  parseLastSession,
  restoreLastSession,
  type SessionTab
} from '@/app/tabs/open/last-session'

function tab(
  id: string,
  source: { path?: string; documentId?: string; roomId?: string },
  kind: SessionTab['kind'] = 'document'
): SessionTab {
  return {
    id,
    kind,
    roomId: source.roomId ?? null,
    store: {
      state: { documentName: `Design ${id}` },
      getStorageBinding: () =>
        source.documentId ? { providerId: 's3', documentId: source.documentId } : null,
      getSourceIdentity: () => ({ path: source.path ?? null })
    }
  }
}

describe('last session', () => {
  test('records reopenable tabs in order with the active one', () => {
    const session = describeOpenTabs(
      [
        tab('home', {}, 'home'),
        tab('a', { path: '/a.fig' }),
        tab('b', {}),
        tab('c', { documentId: 'd1' }),
        tab('r', { roomId: 'room-1' })
      ],
      'c'
    )
    expect(session).toEqual({
      documents: [
        { kind: 'local', path: '/a.fig' },
        { kind: 'storage', providerId: 's3', documentId: 'd1', name: 'Design c' },
        { kind: 'room', roomId: 'room-1' }
      ],
      active: 1
    })
    expect(parseLastSession(JSON.stringify(session))).toEqual(session)
    expect(parseLastSession('{"documents":[{"kind":"other"}],"active":0}')).toBeNull()
    expect(parseLastSession('not json')).toBeNull()
  })

  test('reopens every design, focuses the last active one, and reports failures', async () => {
    const opened: string[] = []
    const focused: string[] = []
    const storageOpens: StorageDocument[] = []
    let current = ''
    const openers = {
      activeProviderId: 's3',
      async openPath(path: string) {
        if (path === '/missing.fig') throw new Error('missing')
        current = path
        opened.push(path)
      },
      joinRoom(roomId: string) {
        if (roomId === 'bad') return false
        current = roomId
        opened.push(roomId)
        return true
      },
      async storageMetadata(documentId: string) {
        return documentId === 'd1' ? { name: 'D1 renamed', updatedAt: '2026-10-13' } : null
      },
      async openStorageDocument(document: StorageDocument) {
        current = document.id
        opened.push(document.id)
        storageOpens.push(document)
      },
      activeTabId: () => current,
      focus: (id: string) => void focused.push(id)
    }
    const ok = await restoreLastSession(
      {
        documents: [
          { kind: 'local', path: '/a.fig' },
          { kind: 'storage', providerId: 's3', documentId: 'd1', name: 'D1' },
          { kind: 'room', roomId: 'room-1' }
        ],
        active: 0
      },
      openers
    )
    expect(ok).toBe(true)
    expect(opened).toEqual(['/a.fig', 'd1', 'room-1'])
    expect(focused).toEqual(['/a.fig'])
    // The remote's own metadata decides whether a cached copy is still current.
    expect(storageOpens[0]).toEqual({
      id: 'd1',
      name: 'D1 renamed',
      updatedAt: '2026-10-13',
      metadataAuthoritative: true
    })

    const partial = await restoreLastSession(
      {
        documents: [
          { kind: 'local', path: '/missing.fig' },
          { kind: 'storage', providerId: 'other', documentId: 'd2', name: 'D2' },
          { kind: 'room', roomId: 'bad' }
        ],
        active: 0
      },
      openers
    )
    expect(partial).toBe(false)
  })
})
