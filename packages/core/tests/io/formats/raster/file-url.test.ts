import { expect, test } from 'bun:test'

import { fileURLPath } from '#core/file-url'

test('drops the slash before a Windows drive letter', () => {
  expect(fileURLPath('file:///C:/Users/me/npm/canvaskit-wasm/bin/full/')).toBe(
    'C:/Users/me/npm/canvaskit-wasm/bin/full/'
  )
})

test('decodes escaped characters', () => {
  expect(fileURLPath('file:///D:/My%20Apps/canvaskit.wasm')).toBe('D:/My Apps/canvaskit.wasm')
})

test('keeps POSIX paths unchanged', () => {
  expect(fileURLPath('file:///usr/lib/canvaskit-wasm/bin/full/')).toBe(
    '/usr/lib/canvaskit-wasm/bin/full/'
  )
})

test('accepts a URL object', () => {
  expect(fileURLPath(new URL('canvaskit.wasm', 'file:///C:/a/b/'))).toBe('C:/a/b/canvaskit.wasm')
})
