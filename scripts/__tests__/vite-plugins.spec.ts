// @vitest-environment node
import type { ViteDevServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { serveConfigsPlugin } from '#scripts/vite-plugins'

function requestConfig(url: string) {
  let handler: (req: { url: string }, res: unknown, next: () => void) => void = () => {}
  const server = {
    middlewares: {
      use: (fn: typeof handler) => {
        handler = fn
      },
    },
  }
  ;(serveConfigsPlugin().configureServer as (server: ViteDevServer) => void)(server as unknown as ViteDevServer)
  const res = { setHeader: vi.fn(), end: vi.fn() }
  const next = vi.fn()
  handler({ url }, res, next)
  return { served: res.end.mock.calls[0]?.[0] as string | undefined, next }
}

describe('serveConfigsPlugin', () => {
  it('serves a JSON file of the configs directory', () => {
    expect(JSON.parse(requestConfig('/configs/atlas-registry.json?v=1').served!)).toHaveProperty('atlases')
  })

  it.each([
    '/configs/../package.json',
    '/configs/%2e%2e/package.json',
    '/configs/..%2fpackage.json',
    '/configs/%E0%A4%A',
    '/configs/schemas',
    '/package.json',
  ])('passes %s to the next middleware', (url) => {
    const { served, next } = requestConfig(url)
    expect(served).toBeUndefined()
    expect(next).toHaveBeenCalledOnce()
  })
})
