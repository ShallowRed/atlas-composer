import type { BasemapFrame } from '@/core/basemap'
import { readFileSync } from 'node:fs'
import { VectorTile } from '@mapbox/vector-tile'
import { geoArea, geoMercator } from 'd3-geo'
import Pbf from 'pbf'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VECTOR_PALETTES } from '@/core/basemap'

// happy-dom draws no canvas: a context that answers each call, and opaque pixels for every tile
class FakeContext {
  createImageData(width: number, height: number) {
    return { data: new Uint8ClampedArray(width * height * 4) }
  }

  getImageData(_x: number, _y: number, width: number, height: number) {
    return { data: new Uint8ClampedArray(width * height * 4).fill(200) }
  }

  putImageData() {}
  drawImage() {}
  scale() {}
  save() {}
  restore() {}
  beginPath() {}
  rect() {}
  clip() {}
  fillRect() {}
  fill() {}
  stroke() {}
  setLineDash() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  arc() {}
  strokeText() {}
  fillText() {}
}

class FakeCanvas {
  width: number
  height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  getContext() {
    return new FakeContext()
  }

  convertToBlob() {
    return Promise.resolve(new Blob(['image']))
  }
}

function frame(longitude: number, latitude: number, scale: number): BasemapFrame {
  const extent: BasemapFrame['extent'] = [[0, 0], [64, 32]]
  return { code: 'X', projection: geoMercator().scale(scale).center([longitude, latitude]).translate([32, 16]) as never, extent }
}

const options = () => ({ width: 64, height: 32, pixelRatio: 1, palette: VECTOR_PALETTES.light, locale: 'fr', signal: new AbortController().signal })

let renderer: typeof import('@/services/rendering/basemap-renderer')
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.stubGlobal('OffscreenCanvas', FakeCanvas)
  vi.stubGlobal('createImageBitmap', async () => ({ close() {} }))
  fetchMock = vi.fn(async () => new Response(new Blob(['tile'])))
  vi.stubGlobal('fetch', fetchMock)
  // A fresh module for each test: the tile cache lives in the module
  vi.resetModules()
  renderer = await import('@/services/rendering/basemap-renderer')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('renderBasemap', () => {
  it('draws nothing and requests nothing without a source', async () => {
    const result = await renderer.renderBasemap([frame(2, 48, 2000)], 'none', options())
    expect(result?.ok && result.value.missingTiles).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requests no tile again for a second render or for the final pass', async () => {
    const frames = [frame(2, 48, 2000)]
    await renderer.renderBasemap(frames, 'imagery', { ...options(), pixelRatio: 0.5, zoomPixelRatio: 1 })
    const requests = fetchMock.mock.calls.length
    expect(requests).toBeGreaterThan(0)
    await renderer.renderBasemap(frames, 'imagery', options())
    expect(fetchMock.mock.calls.length).toBe(requests)
  })

  it('returns no image once interrupted', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(await renderer.renderBasemap([frame(2, 48, 2000)], 'imagery', { ...options(), signal: controller.signal })).toBeNull()
  })

  it('shares a request between two renders, and the interruption of one leaves the other its image', async () => {
    const controller = new AbortController()
    const frames = [frame(10, 60, 2000)]
    const first = renderer.renderBasemap(frames, 'imagery', { ...options(), signal: controller.signal })
    const second = renderer.renderBasemap(frames, 'imagery', options())
    controller.abort()
    expect(await first).toBeNull()
    const result = await second
    expect(result?.ok).toBe(true)
    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('fails when no tile loads, and counts the missing tiles when some do', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 404 }))
    const failed = await renderer.renderBasemap([frame(-60, 15, 2000)], 'imagery', options())
    expect(failed?.ok).toBe(false)
    expect(!failed?.ok && failed?.error.code).toBe('BASEMAP_TILES_FAILED')

    let calls = 0
    fetchMock.mockImplementation(async () => (calls++ % 2 === 0 ? new Response(new Blob(['tile'])) : new Response(null, { status: 404 })))
    const partial = await renderer.renderBasemap([frame(140, 36, 300)], 'imagery', options())
    expect(partial?.ok && partial.value.missingTiles).toBeGreaterThan(0)
  })

  it('reports a TileJSON that does not respond', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 503 }))
    const result = await renderer.renderBasemap([frame(2, 48, 2000)], 'streets', options())
    expect(!result?.ok && result?.error.code).toBe('BASEMAP_SOURCE_UNREACHABLE')
  })

  // Once the cache is full, the tiles of the first frame have left it and are requested again
  it('keeps the raster tiles within 48 MB', async () => {
    fetchMock.mockImplementation(async () => new Response(new Blob([new Uint8Array(4 * 1024 * 1024)])))
    const first = [frame(-170, 0, 3000)]
    await renderer.renderBasemap(first, 'imagery', options())
    const firstRequests = fetchMock.mock.calls.length
    for (let longitude = -160; longitude < 170; longitude += 10) {
      await renderer.renderBasemap([frame(longitude, 0, 3000)], 'imagery', options())
    }
    const before = fetchMock.mock.calls.length
    await renderer.renderBasemap(first, 'imagery', options())
    expect(fetchMock.mock.calls.length - before).toBe(firstRequests)
  })

  it('keeps 256 vector tiles at most', async () => {
    const tile = readFileSync('src/services/rendering/__tests__/fixtures/openmaptiles-9-320-274.pbf')
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/planet') ? Response.json({ tiles: ['https://tiles.test/{z}/{x}/{y}.pbf'] }) : new Response(tile)))
    const first = [frame(-170, 0, 3000)]
    await renderer.renderBasemap(first, 'streets', options())
    const firstRequests = fetchMock.mock.calls.length - 1
    for (const latitude of [-40, 0, 40]) {
      for (let longitude = -160; longitude < 170; longitude += 3) {
        await renderer.renderBasemap([frame(longitude, latitude, 3000)], 'streets', options())
      }
    }
    const before = fetchMock.mock.calls.length
    await renderer.renderBasemap(first, 'streets', options())
    expect(fetchMock.mock.calls.length - before).toBe(firstRequests)
  })

  it('counts a tile whose body does not read as missing, and requests it again', async () => {
    fetchMock.mockImplementation(async () => {
      const response = new Response(new Blob(['tile']))
      vi.spyOn(response, 'blob').mockRejectedValue(new TypeError('body'))
      return response
    })
    const frames = [frame(30, -20, 2000)]
    const failed = await renderer.renderBasemap(frames, 'imagery', options())
    expect(!failed?.ok && failed?.error.code).toBe('BASEMAP_TILES_FAILED')
    const requests = fetchMock.mock.calls.length
    fetchMock.mockImplementation(async () => new Response(new Blob(['tile'])))
    const result = await renderer.renderBasemap(frames, 'imagery', options())
    expect(result?.ok).toBe(true)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(requests)
  })
})

describe('openMapTiles polygons', () => {
  it('decode to areas that d3 fills, under half the sphere', () => {
    const tile = new VectorTile(new Pbf(readFileSync('src/services/rendering/__tests__/fixtures/openmaptiles-9-320-274.pbf')))
    const polygons = ['water', 'landcover', 'landuse'].flatMap((name) => {
      const layer = tile.layers[name]
      return layer ? Array.from({ length: layer.length }, (_, i) => layer.feature(i).toGeoJSON(320, 274, 9)) : []
    }).filter(feature => feature.geometry.type.endsWith('Polygon'))
    expect(polygons.length).toBeGreaterThan(0)
    for (const polygon of polygons) {
      expect(geoArea(polygon)).toBeLessThan(2 * Math.PI)
    }
  })
})
