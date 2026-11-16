// @vitest-environment node
import type { HtmlTagDescriptor, ViteDevServer } from 'vite'
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { contentSecurityPolicyPlugin, serveConfigsPlugin } from '#scripts/vite-plugins'

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

function policyOf(html: string): string {
  const { handler } = contentSecurityPolicyPlugin().transformIndexHtml as { handler: (html: string) => HtmlTagDescriptor[] }
  return handler(html)[0]!.attrs!.content as string
}

const sha256 = (script: string) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`

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

describe('contentSecurityPolicyPlugin', () => {
  it('admits each inline script by its hash, and the external scripts by their origin', () => {
    const policy = policyOf('<script>a()</script><script type="text/javascript">b()</script><script type="module" src="main.js"></script>')
    expect(policy).toContain(`script-src 'self' ${sha256('a()')} ${sha256('b()')};`)
  })

  it('admits the hosts of the basemaps and of the earthquake feed', () => {
    expect(policyOf('')).toContain(`connect-src 'self' https://earthquake.usgs.gov https://tiles.openfreemap.org https://tiles.maps.eox.at;`)
  })
})
