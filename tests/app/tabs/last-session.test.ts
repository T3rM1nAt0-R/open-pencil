import { describe, expect, test } from 'bun:test'

import type { StorageDocument, StorageLocation } from '@/app/integrations/storage'
import {
  describeOpenTabs,
  parseLastSession,
  restoreLastSession,
  storedDocumentMetadata,
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
    const storageLocations: StorageLocation[] = []
    let current = ''
    const openers = {
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
      async storageMetadata(documentId: string, location: StorageLocation) {
        // A provider that is not set up on this device cannot say what it holds.
        if (location.providerId === 'offline') throw new Error('Provider not set up')
        if (documentId === 'deleted') return null
        return documentId === 'd1' ? { name: 'D1 renamed', updatedAt: '2026-10-13' } : undefined
      },
      async openStorageDocument(document: StorageDocument, location: StorageLocation) {
        storageLocations.push(location)
        current = document.id
        opened.push(document.id)
        storageOpens.push(document)
      },
      activeTabId: () => current,
      focus: (id: string) => void focused.push(id),
      showHome: () => void focused.push('home')
    }
    const ok = await restoreLastSession(
      {
        documents: [
          { kind: 'local', path: '/a.fig' },
          {
            kind: 'storage',
            providerId: 's3',
            documentId: 'd1',
            name: 'D1',
            profileId: 'work',
            containerId: 'team'
          },
          { kind: 'room', roomId: 'room-1' }
        ],
        active: 0
      },
      openers
    )
    expect(ok).toBe(true)
    // The design reopens from its own account and workspace, not the default ones.
    expect(storageLocations).toEqual([{ providerId: 's3', profileId: 'work', containerId: 'team' }])
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
          { kind: 'storage', providerId: 'offline', documentId: 'd2', name: 'D2' },
          { kind: 'room', roomId: 'bad' },
          { kind: 'storage', providerId: 's3', documentId: 'deleted', name: 'Gone' }
        ],
        active: 0
      },
      openers
    )
    expect(partial).toBe(false)
    expect(opened).not.toContain('deleted')
  })

  test('reopens a design from a provider other than the active one', async () => {
    const opened: string[] = []
    const ok = await restoreLastSession(
      {
        documents: [{ kind: 'storage', providerId: 'drive', documentId: 'd9', name: 'D9' }],
        active: 0
      },
      {
        openPath: async () => undefined,
        joinRoom: () => true,
        storageMetadata: async () => undefined,
        openStorageDocument: async (document) => void opened.push(document.id),
        activeTabId: () => 'tab',
        focus: () => undefined,
        showHome: () => undefined
      }
    )
    expect(ok).toBe(true)
    expect(opened).toEqual(['d9'])
  })

  test('puts Home in front when Home was in front, and yields to a newer open', async () => {
    const events: string[] = []
    let current = ''
    const openers = {
      openPath: async (path: string) => {
        current = path
      },
      joinRoom: () => true,
      storageMetadata: async () => undefined,
      openStorageDocument: async () => undefined,
      activeTabId: () => current,
      focus: (id: string) => void events.push(`focus ${id}`),
      showHome: () => void events.push('home')
    }
    const session = { documents: [{ kind: 'local' as const, path: '/a.fig' }], active: -1 }
    expect(await restoreLastSession(session, openers)).toBe(true)
    expect(events).toEqual(['home'])

    // A file opened while the restore ran stays in front.
    events.length = 0
    let reads = 0
    const interrupted = {
      ...openers,
      // The first read is the restored design; after that a link's design is in front.
      activeTabId: () => (reads++ === 0 ? '/a.fig' : 'opened-by-link')
    }
    await restoreLastSession(session, interrupted)
    reads = 0
    await restoreLastSession({ ...session, active: 0 }, interrupted)
    expect(events).toEqual([])
  })
})

describe('stored design metadata on reopen', () => {
  const metadata = { name: 'Plan', updatedAt: '2026-10-15T00:00:00.000Z' }

  test('a design with metadata reopens with it', async () => {
    const adapter = {
      getDocumentMetadata: async () => metadata,
      documentExists: async () => true
    }
    expect(await storedDocumentMetadata(adapter, 'plan')).toEqual(metadata)
  })

  test('a design whose metadata is missing is still there, so it reopens without it', async () => {
    const adapter = {
      getDocumentMetadata: async () => null,
      documentExists: async () => true
    }
    expect(await storedDocumentMetadata(adapter, 'plan')).toBeUndefined()
  })

  test('a design gone from storage is skipped', async () => {
    const adapter = {
      getDocumentMetadata: async () => null,
      documentExists: async () => false
    }
    expect(await storedDocumentMetadata(adapter, 'plan')).toBeNull()
  })

  test('a provider without metadata cannot tell', async () => {
    expect(await storedDocumentMetadata({}, 'plan')).toBeUndefined()
  })

  test('a provider that can only check existence skips a design that is gone', async () => {
    const adapter = { documentExists: async () => false }
    expect(await storedDocumentMetadata(adapter, 'plan')).toBeNull()
  })

  test('a provider that can only check existence reopens a design that is there', async () => {
    const adapter = { documentExists: async () => true }
    expect(await storedDocumentMetadata(adapter, 'plan')).toBeUndefined()
  })

  test('a refused existence check does not hide a design that has no metadata', async () => {
    const refused = async () => {
      throw new Error('HEAD blocked')
    }
    expect(await storedDocumentMetadata({ documentExists: refused }, 'plan')).toBeUndefined()
    expect(
      await storedDocumentMetadata(
        { getDocumentMetadata: async () => null, documentExists: refused },
        'plan'
      )
    ).toBeUndefined()
  })
})

describe('stored design that is gone but still has metadata', () => {
  test('is skipped rather than reopened from a cached copy', async () => {
    const adapter = {
      getDocumentMetadata: async () => ({ name: 'Plan', updatedAt: '2026-10-15T00:00:00.000Z' }),
      documentExists: async () => false
    }
    expect(await storedDocumentMetadata(adapter, 'plan')).toBeNull()
  })

  test('reopens with its metadata when the check cannot be made', async () => {
    const metadata = { name: 'Plan', updatedAt: '2026-10-15T00:00:00.000Z' }
    const adapter = {
      getDocumentMetadata: async () => metadata,
      documentExists: async () => {
        throw new Error('HEAD blocked')
      }
    }
    expect(await storedDocumentMetadata(adapter, 'plan')).toEqual(metadata)
  })
})
