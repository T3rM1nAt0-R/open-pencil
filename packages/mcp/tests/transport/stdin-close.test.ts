import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ENTRY = Bun.resolveSync('#mcp/index', import.meta.dir)
const READY = 'OpenPencil MCP server'

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

/** Starts the server on a private socket and waits until it reports that it is listening. */
async function startServer(env: Record<string, string>) {
  const directory = mkdtempSync(join(tmpdir(), 'op-mcp-stdin-'))
  const child = Bun.spawn(['bun', ENTRY], {
    stdin: 'pipe',
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: '0',
      OPENPENCIL_MCP_SOCKET: join(directory, 'mcp.sock'),
      OPENPENCIL_MCP_AUTH_TOKEN: '',
      ...env
    }
  })
  cleanups.push(() => {
    child.kill()
    rmSync(directory, { recursive: true, force: true })
  })
  const reader = child.stderr.getReader()
  const decoder = new TextDecoder()
  let output = ''
  while (!output.includes(READY)) {
    const { done, value } = await reader.read()
    if (done) throw new Error(`The server exited before it was ready: ${output}`)
    output += decoder.decode(value)
  }
  reader.releaseLock()
  return child
}

describe('closing the standard input of the HTTP server', () => {
  test('shuts it down when the parent asked for that', async () => {
    const child = await startServer({ OPENPENCIL_MCP_EXIT_ON_STDIN_CLOSE: '1' })
    await child.stdin.end()

    expect(await child.exited).toBe(0)
  })

  test('leaves a server started by hand running', async () => {
    const child = await startServer({})
    await child.stdin.end()
    const outcome = await Promise.race([child.exited, Bun.sleep(500).then(() => 'running')])

    expect(outcome).toBe('running')
  })
})
