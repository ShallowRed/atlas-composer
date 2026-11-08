import type { GeoDataConfig } from '@/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeoDataService } from '@/services/data/geo-data-service'

const DATA_PATH = '/data/test-territories.json'
const METADATA_PATH = '/data/test-metadata.json'

const config: GeoDataConfig = {
  dataPath: DATA_PATH,
  metadataPath: METADATA_PATH,
  topologyObjectName: 'territories',
  territories: [],
}

const topology = JSON.stringify({
  type: 'Topology',
  arcs: [[[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]],
  objects: {
    territories: {
      type: 'GeometryCollection',
      geometries: [{ type: 'Polygon', arcs: [[0]], id: '1', properties: { code: 'XX', name: 'Test' } }],
    },
  },
})

interface FakeResponse {
  status?: number
  body?: string
}

const json = (body: string): FakeResponse => ({ body })

function stubFetch(responses: Record<string, FakeResponse | 'reject'>) {
  vi.stubGlobal('fetch', async (url: string) => {
    const response = responses[url]
    if (!response) {
      throw new Error(`Unexpected fetch of ${url}`)
    }
    if (response === 'reject') {
      throw new TypeError('Failed to fetch')
    }
    return new Response(response.body ?? '', { status: response.status ?? 200 })
  })
}

async function loadData(responses: Record<string, FakeResponse | 'reject'>) {
  stubFetch(responses)
  return await new GeoDataService(config).loadData()
}

describe('geoDataService.loadData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok for a valid topology and metadata', async () => {
    const result = await loadData({ [DATA_PATH]: json(topology), [METADATA_PATH]: json('{}') })

    expect(result.ok).toBe(true)
  })

  describe.each([
    ['data', DATA_PATH, { [METADATA_PATH]: json('{}') }],
    ['metadata', METADATA_PATH, { [DATA_PATH]: json(topology) }],
  ])('%s file', (_, path, otherResponses) => {
    it('returns JSON_FILE_NOT_FOUND for a 404', async () => {
      const result = await loadData({ ...otherResponses, [path]: { status: 404 } })

      expect(result).toEqual({ ok: false, error: { code: 'JSON_FILE_NOT_FOUND', path } })
    })

    it('returns JSON_FILE_NETWORK_ERROR for another failed status', async () => {
      const result = await loadData({ ...otherResponses, [path]: { status: 500 } })

      expect(result).toEqual({ ok: false, error: { code: 'JSON_FILE_NETWORK_ERROR', path, status: 500 } })
    })

    it('returns JSON_FILE_MALFORMED for a body that is not JSON', async () => {
      const result = await loadData({ ...otherResponses, [path]: json('{') })

      expect(result).toEqual({ ok: false, error: { code: 'JSON_FILE_MALFORMED', path } })
    })

    it('returns JSON_FILE_UNREACHABLE when fetch rejects', async () => {
      const result = await loadData({ ...otherResponses, [path]: 'reject' })

      expect(result).toEqual({ ok: false, error: { code: 'JSON_FILE_UNREACHABLE', path } })
    })
  })

  it('returns GEODATA_MISSING_OBJECT for a topology without the territories object', async () => {
    const result = await loadData({
      [DATA_PATH]: json(JSON.stringify({ type: 'Topology', arcs: [], objects: {} })),
      [METADATA_PATH]: json('{}'),
    })

    expect(result).toEqual({ ok: false, error: { code: 'GEODATA_MISSING_OBJECT', objectName: 'territories' } })
  })

  it('returns GEODATA_INVALID_STRUCTURE for a null body', async () => {
    const result = await loadData({ [DATA_PATH]: json('null'), [METADATA_PATH]: json('{}') })

    expect(result).toEqual({ ok: false, error: { code: 'GEODATA_INVALID_STRUCTURE', path: DATA_PATH } })
  })
})
