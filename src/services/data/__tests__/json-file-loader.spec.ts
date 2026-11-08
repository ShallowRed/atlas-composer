import { afterEach, describe, expect, it, vi } from 'vitest'
import { JsonFileLoader } from '@/services/data/json-file-loader'

const PATH = 'configs/example.json'

function stubFetch(respond: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(respond))
}

const unreadableBody = {
  ok: true,
  headers: new Headers(),
  text: () => Promise.reject(new Error('body stream failed')),
  json: () => Promise.reject(new Error('body stream failed')),
} as unknown as Response

describe('loadJSON', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the content of the file', async () => {
    stubFetch(async () => new Response('{"name":"example"}'))

    const result = await JsonFileLoader.loadJSON(PATH)

    expect(result).toMatchObject({ success: true, data: { name: 'example' } })
  })

  it.each([
    ['a missing file', async () => new Response('', { status: 404 })],
    ['a server failure', async () => new Response('', { status: 500 })],
    ['an unreachable server', async () => Promise.reject(new TypeError('Failed to fetch'))],
    ['a body that is not JSON', async () => new Response('<!doctype html>')],
    ['an unreadable body', async () => unreadableBody],
  ])('fails on %s and names the file', async (_name, respond) => {
    stubFetch(respond)

    const result = await JsonFileLoader.loadJSON(PATH)

    expect(result.success).toBe(false)
    expect(result.errors.join()).toContain(PATH)
  })
})
