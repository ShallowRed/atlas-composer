import { afterEach, describe, expect, it, vi } from 'vitest'
import { JsonFileLoader } from '@/services/data/json-file-loader'

const PATH = 'configs/example.json'
const URL = `/${PATH}`

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

  it('asks for JSON, so that the Vite server answers 404 for a missing file', async () => {
    const respond = vi.fn(async () => new Response('{}'))
    stubFetch(respond)

    await JsonFileLoader.loadJSON(PATH)

    expect(respond).toHaveBeenCalledWith(URL, { headers: { Accept: 'application/json' } })
  })

  it.each([
    ['a missing file', async () => new Response('', { status: 404 }), { code: 'JSON_FILE_NOT_FOUND', path: URL }],
    ['a server failure', async () => new Response('', { status: 500 }), { code: 'JSON_FILE_NETWORK_ERROR', path: URL, status: 500 }],
    ['an unreachable server', async () => Promise.reject(new TypeError('Failed to fetch')), { code: 'JSON_FILE_UNREACHABLE', path: URL }],
    ['a body that is not JSON', async () => new Response('<!doctype html>'), { code: 'JSON_FILE_MALFORMED', path: URL }],
    ['an unreadable body', async () => unreadableBody, { code: 'JSON_FILE_MALFORMED', path: URL }],
  ])('fails on %s', async (_name, respond, error) => {
    stubFetch(respond)

    const result = await JsonFileLoader.loadJSON(PATH)

    expect(result).toEqual({ ok: false, error })
  })
})
