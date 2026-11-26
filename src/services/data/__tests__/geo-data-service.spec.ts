import type { GeoDataConfig } from '@/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeoDataService } from '@/services/data/geo-data-service'

const DATA_PATH = '/data/test-territories.json'
const METADATA_PATH = '/data/test-metadata.json'

const config: GeoDataConfig = {
  dataPath: DATA_PATH,
  metadataPath: METADATA_PATH,
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

  it('returns GEODATA_INVALID_STRUCTURE for a GeoJSON feature collection', async () => {
    const collection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { code: 'XX' }, geometry: null }] }
    const result = await loadData({ [DATA_PATH]: json(JSON.stringify(collection)), [METADATA_PATH]: json('{}') })

    expect(result).toEqual({ ok: false, error: { code: 'GEODATA_INVALID_STRUCTURE', path: DATA_PATH } })
  })

  it('returns GEODATA_INVALID_STRUCTURE for a null body', async () => {
    const result = await loadData({ [DATA_PATH]: json('null'), [METADATA_PATH]: json('{}') })

    expect(result).toEqual({ ok: false, error: { code: 'GEODATA_INVALID_STRUCTURE', path: DATA_PATH } })
  })
})

describe('geoDataService.simplified', () => {
  // A square with a notch of 0.1 degree on its south side, as a ring clockwise in longitude and latitude
  const notched = JSON.stringify({
    type: 'Topology',
    arcs: [[[0, 0], [0, 4], [4, 4], [4, 0], [2.1, 0], [2, 0.1], [1.9, 0], [0, 0]]],
    objects: { territories: { type: 'GeometryCollection', geometries: [{ type: 'Polygon', arcs: [[0]], properties: { code: 'XX', name: 'Test' } }] } },
  })

  async function loadedService() {
    stubFetch({ [DATA_PATH]: json(notched), [METADATA_PATH]: json('{}') })
    const service = new GeoDataService(config)
    await service.loadData()
    return service
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('removes the points below the weight of a territory, and keeps them at the weight 0', async () => {
    const service = await loadedService()
    const ring = (weight: number) => (service.simplified(new Map([['XX', weight]])).feature('XX')!.geometry as GeoJSON.Polygon).coordinates[0]!

    expect(ring(0)).toContainEqual([2, 0.1])
    expect(ring(1e-4)).not.toContainEqual([2, 0.1])
    expect(ring(1e-4)).toContainEqual([4, 4])
  })

  it('gives no feature for a code outside the weights, and the same result again for the same weights', async () => {
    const service = await loadedService()
    const simplified = service.simplified(new Map([['XX', 0]]))

    expect(service.simplified(new Map()).feature('XX')).toBeUndefined()
    expect(service.simplified(new Map([['XX', 0]]))).not.toBe(simplified)
    const again = service.simplified(new Map([['XX', 0]]))
    expect(service.simplified(new Map([['XX', 0]]))).toBe(again)
  })

  it('gives the centroid of each territory', async () => {
    const [longitude, latitude] = (await loadedService()).centroid('XX')!

    expect(longitude).toBeCloseTo(2, 1)
    expect(latitude).toBeCloseTo(2, 1)
  })
})

describe('geoDataService.simplified mesh', () => {
  // One territory of two squares that meet at the antimeridian, as Natural Earth cuts an island there, rings clockwise
  const cutAtAntimeridian = JSON.stringify({
    type: 'Topology',
    arcs: [
      [[178, -18], [178, -16], [180, -16], [180, -18], [178, -18]],
      [[-180, -18], [-180, -16], [-178, -16], [-178, -18], [-180, -18]],
    ],
    objects: { territories: { type: 'GeometryCollection', geometries: [{ type: 'MultiPolygon', arcs: [[[0]], [[1]]], properties: { code: 'XX', name: 'Test' } }] } },
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('draws the outline of a territory cut at the antimeridian without the cut', async () => {
    stubFetch({ [DATA_PATH]: json(cutAtAntimeridian), [METADATA_PATH]: json('{}') })
    const service = new GeoDataService(config)
    await service.loadData()

    const { coordinates } = service.simplified(new Map([['XX', 0]])).mesh(['XX'])
    const alongAntimeridian = coordinates.flatMap(line => line.slice(1).filter((point, index) => Math.abs(point[0]!) === 180 && point[0] === line[index]![0]))

    expect(alongAntimeridian).toEqual([])
    expect(coordinates.flat()).toContainEqual([178, -16])
    expect(coordinates.flat()).toContainEqual([-178, -18])
  })
})
