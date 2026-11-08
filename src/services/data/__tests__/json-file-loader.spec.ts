import { afterEach, describe, expect, it, vi } from 'vitest'
import { JsonFileLoader } from '@/services/data/json-file-loader'

const PATH = 'configs/example.json'

function stubFetch(respond: () => Promise<Response>) {
  vi.stubGlobal('fetch', respond)
}

const unreadableBody = {
  ok: true,
  json: () => Promise.reject(new Error('body stream failed')),
} as unknown as Response

describe('loadJSON', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the content of the file', async () => {
    stubFetch(async () => new Response('{"name":"example"}'))

    const result = await JsonFileLoader.loadJSON(PATH)

    expect(result).toEqual({ ok: true, value: { name: 'example' } })
  })

  it.each([
    ['a missing file', async () => new Response('', { status: 404 }), { code: 'JSON_FILE_NOT_FOUND', path: PATH }],
    ['a server failure', async () => new Response('', { status: 500 }), { code: 'JSON_FILE_NETWORK_ERROR', path: PATH, status: 500 }],
    ['an unreachable server', async () => Promise.reject(new TypeError('Failed to fetch')), { code: 'JSON_FILE_UNREACHABLE', path: PATH }],
    ['a body that is not JSON', async () => new Response('<!doctype html>'), { code: 'JSON_FILE_MALFORMED', path: PATH }],
    ['an unreadable body', async () => unreadableBody, { code: 'JSON_FILE_MALFORMED', path: PATH }],
  ])('fails on %s', async (_name, respond, error) => {
    stubFetch(respond)

    const result = await JsonFileLoader.loadJSON(PATH)

    expect(result).toEqual({ ok: false, error })
  })
})
