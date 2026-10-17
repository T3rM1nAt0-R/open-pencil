import { describe, expect, test } from 'bun:test'

import type { ToolDescriptor } from '@open-pencil/mcp/tools'

import { createMCPRuntimeService, type MCPRuntimeDependencies } from '@/app/automation/mcp/runtime'

function descriptor(name = 'get_page_tree'): ToolDescriptor {
  return {
    name,
    description: name,
    effect: 'read',
    availability: 'default',
    capabilities: ['document:read'],
    enabled: true
  }
}

function setup(overrides: Partial<MCPRuntimeDependencies> = {}) {
  const calls: string[] = []
  const catalogs: ToolDescriptor[][] = []
  const dependencies: MCPRuntimeDependencies = {
    canConnect: () => true,
    connect: () => {
      calls.push('connect')
      return () => calls.push('disconnect-bridge')
    },
    readHealth: async () => ({
      status: 'ok',
      version: '0.14.0',
      tools: [descriptor()]
    }),
    setToolDescriptors: (tools) => catalogs.push(tools),
    getStartupFailure: () => null,
    getHealthFailure: () => null,
    spawn: async () => ({
      authToken: 'token',
      managed: true,
      disconnect: () => {
        calls.push('disconnect-server')
      }
    }),
    ...overrides
  }
  return { calls, catalogs, service: createMCPRuntimeService(dependencies) }
}

const getStore = () => ({}) as never

/** Waits for a condition the watcher reaches on its own timer, instead of guessing a delay. */
async function until(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for the condition')
    await Bun.sleep(2)
  }
}

describe('MCP runtime service', () => {
  test('starts only after a healthy server response', async () => {
    const { calls, catalogs, service } = setup()

    expect(await service.start(getStore)).toEqual({ ok: true })
    expect(service.state.status).toBe('running')
    expect(service.state.version).toBe('0.14.0')
    expect(calls).toEqual(['connect'])
    expect(catalogs.at(-1)?.map((tool) => tool.name)).toEqual(['get_page_tree'])
  })

  test('serializes refresh behind stop so stale health cannot restore running state', async () => {
    let releaseHealth: (() => void) | undefined
    const blockedHealth = new Promise<void>((resolve) => {
      releaseHealth = resolve
    })
    let healthCalls = 0
    const { service } = setup({
      readHealth: async () => {
        healthCalls++
        if (healthCalls === 2) await blockedHealth
        return { status: 'ok', tools: [descriptor()] }
      }
    })
    await service.start(getStore)

    const refresh = service.refresh()
    const stop = service.stop()
    releaseHealth?.()
    await Promise.all([refresh, stop])

    expect(service.state.status).toBe('stopped')
  })

  test('reports startup failure and cleans up the spawned server', async () => {
    const { calls, service } = setup({ readHealth: async () => null })

    const result = await service.start(getStore)

    expect(result.ok).toBe(false)
    expect(service.state.status).toBe('error')
    expect(service.state.failure).toEqual({
      code: 'unreachable',
      detail: expect.any(String)
    })
    expect(calls).toEqual(['disconnect-server'])
  })

  test('surfaces why the server could not start instead of a generic message', async () => {
    const { service } = setup({
      spawn: async () => null,
      readHealth: async () => null,
      getStartupFailure: () => ({
        code: 'not-installed',
        detail: '@open-pencil/mcp@0.15.0'
      })
    })

    await service.start(getStore)

    expect(service.state.failure).toEqual({
      code: 'not-installed',
      detail: '@open-pencil/mcp@0.15.0'
    })
  })

  test('distinguishes a rejected token from a missing server', async () => {
    const { service } = setup({
      readHealth: async () => null,
      getHealthFailure: () => ({ code: 'rejected', detail: 'HTTP 401' })
    })

    await service.start(getStore)

    expect(service.state.failure).toEqual({
      code: 'rejected',
      detail: 'HTTP 401'
    })
  })

  test('reports an unexpected health payload', async () => {
    const { service } = setup({
      readHealth: async () => null,
      getHealthFailure: () => ({ code: 'malformed', detail: 'HTTP 200' })
    })

    await service.start(getStore)

    expect(service.state.failure).toEqual({
      code: 'malformed',
      detail: 'HTTP 200'
    })
  })

  test('clears local runtime state even when server shutdown fails', async () => {
    const { catalogs, service } = setup({
      spawn: async () => ({
        authToken: 'token',
        managed: true,
        disconnect: () => {
          throw new Error('shutdown failed')
        }
      })
    })
    await service.start(getStore)

    const result = await service.stop()

    expect(result.ok).toBe(false)
    expect(service.state.status).toBe('error')
    expect(service.state.version).toBeNull()
    expect(catalogs.at(-1)).toEqual([])
  })

  test('does not start a replacement when shutdown fails', async () => {
    let spawnCalls = 0
    const { service } = setup({
      spawn: async () => {
        spawnCalls++
        return {
          authToken: 'token',
          managed: true,
          disconnect: () => {
            throw new Error('shutdown failed')
          }
        }
      }
    })
    await service.start(getStore)

    const result = await service.restart()

    expect(result.ok).toBe(false)
    expect(spawnCalls).toBe(1)
    expect(service.state.status).toBe('error')
  })

  test('restarts with the retained editor store inside one lifecycle operation', async () => {
    const { calls, service } = setup()
    await service.start(getStore)

    expect(await service.restart()).toEqual({ ok: true })
    expect(service.state.status).toBe('running')
    expect(calls).toEqual(['connect', 'disconnect-bridge', 'disconnect-server', 'connect'])
  })

  test('starts a new server when the one it started stops answering', async () => {
    let alive = true
    let spawns = 0
    const { service } = setup({
      watchIntervalMs: 5,
      readHealth: async () => (alive ? { status: 'ok', tools: [descriptor()] } : null),
      spawn: async () => {
        spawns++
        alive = true
        return {
          authToken: 'token',
          managed: true,
          disconnect: () => undefined
        }
      }
    })
    await service.start(getStore)
    alive = false
    await until(() => spawns > 1)

    expect(service.state.status).toBe('running')
    await service.stop()
  })

  test('reports the server as unavailable once replacements keep dying', async () => {
    let spawns = 0
    let healthChecks = 0
    const { service } = setup({
      watchIntervalMs: 5,
      // The check after a start passes and the next watch finds the new server dead again.
      readHealth: async () =>
        healthChecks++ % 2 === 0 ? { status: 'ok', tools: [descriptor()] } : null,
      spawn: async () => {
        spawns++
        return {
          authToken: 'token',
          managed: true,
          disconnect: () => undefined
        }
      }
    })
    await service.start(getStore)
    await until(() => service.state.status === 'error')

    expect(spawns).toBe(4)
    expect(service.state.failure?.code).toBe('exited')
    const checks = healthChecks
    await Bun.sleep(30)
    expect(healthChecks).toBe(checks)
  })

  test('does not watch a server after it was stopped', async () => {
    let spawns = 0
    let alive = true
    const { service } = setup({
      watchIntervalMs: 5,
      readHealth: async () => (alive ? { status: 'ok', tools: [descriptor()] } : null),
      spawn: async () => {
        spawns++
        return {
          authToken: 'token',
          managed: true,
          disconnect: () => undefined
        }
      }
    })
    await service.start(getStore)
    await service.stop()
    alive = false
    await Bun.sleep(30)
    expect(spawns).toBe(1)
    expect(service.state.status).toBe('stopped')
  })
})
