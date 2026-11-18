import type { ProjectionFrame } from '@/core/frames'
import { readFileSync } from 'node:fs'
import { VectorTile } from '@mapbox/vector-tile'
import { geoArea, geoMercator } from 'd3-geo'
import { PbfReader } from 'pbf'
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
  measureText(text: string) {
    return { width: text.length * 5 }
  }
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

function frame(longitude: number, latitude: number, scale: number): ProjectionFrame {
  const extent: ProjectionFrame['extent'] = [[0, 0], [64, 32]]
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

  // About 330 renders decode the vector tiles, which can take more than the 5 seconds of vitest on a slow runner
  it('keeps 256 vector tiles at most', async () => {
    const tile = readFileSync('src/services/rendering/__tests__/fixtures/openmaptiles-9-320-274.pbf')
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/planet') ? Response.json({ tiles: ['https://tiles.test/{z}/{x}/{y}.pbf'] }) : new Response(tile)))
    const first = [frame(-170, 0, 20000)]
    await renderer.renderBasemap(first, 'streets', options())
    const firstRequests = fetchMock.mock.calls.length - 1
    for (const latitude of [-40, 0, 40]) {
      for (let longitude = -160; longitude < 170; longitude += 3) {
        await renderer.renderBasemap([frame(longitude, latitude, 20000)], 'streets', options())
      }
    }
    const before = fetchMock.mock.calls.length
    await renderer.renderBasemap(first, 'streets', options())
    expect(firstRequests).toBeGreaterThan(0)
    expect(fetchMock.mock.calls.length - before).toBe(firstRequests)
  }, 30_000)

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

describe('cachedBasemap', () => {
  const FINGERPRINT = 'relief-abc123'
  // The index of the cached images, then each image, by address
  const serve = (index: unknown, image: () => Response = () => new Response(new Blob(['webp']))) => fetchMock.mockImplementation(async (url: string) => (
    String(url).endsWith('/index.json') ? new Response(JSON.stringify(index)) : image()
  ))
  const requestedImages = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('.webp'))

  it('returns the image of a fingerprint that the index lists, and reads the index once', async () => {
    serve([FINGERPRINT])
    const signal = new AbortController().signal

    expect(await renderer.cachedBasemap(FINGERPRINT, signal)).toBeInstanceOf(Blob)
    expect(await renderer.cachedBasemap(FINGERPRINT, signal)).toBeInstanceOf(Blob)

    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/index.json'))).toHaveLength(1)
    expect(String(requestedImages()[0]![0])).toMatch(/basemaps\/dev\/relief-abc123\.webp$/)
  })

  it.each([
    ['without an index', () => serve(null, () => new Response('', { status: 404 })), FINGERPRINT],
    ['for a fingerprint that the index does not list', () => serve(['relief-other']), FINGERPRINT],
    ['for a fingerprint outside its pattern, though the index lists it', () => serve(['../relief']), '../relief'],
  ])('returns null and requests no image %s', async (_, setup, fingerprint) => {
    setup()
    expect(await renderer.cachedBasemap(fingerprint, new AbortController().signal)).toBeNull()
    expect(requestedImages()).toHaveLength(0)
  })

  it('returns null when the image answers an error or does not decode', async () => {
    serve([FINGERPRINT], () => new Response('', { status: 500 }))
    expect(await renderer.cachedBasemap(FINGERPRINT, new AbortController().signal)).toBeNull()

    serve([FINGERPRINT])
    vi.stubGlobal('createImageBitmap', async () => {
      throw new DOMException('The source image could not be decoded.', 'InvalidStateError')
    })
    expect(await renderer.cachedBasemap(FINGERPRINT, new AbortController().signal)).toBeNull()
  })

  it('returns null once interrupted, and passes the signal to the request of the image', async () => {
    serve([FINGERPRINT])
    const controller = new AbortController()
    const pending = renderer.cachedBasemap(FINGERPRINT, controller.signal)
    controller.abort()

    expect(await pending).toBeNull()
    const second = new AbortController()
    await renderer.cachedBasemap(FINGERPRINT, second.signal)
    expect(requestedImages().at(-1)![1]).toMatchObject({ signal: second.signal })
  })
})

describe('openMapTiles polygons', () => {
  it('decode to areas that d3 fills, under half the sphere', () => {
    const tile = new VectorTile(new PbfReader(readFileSync('src/services/rendering/__tests__/fixtures/openmaptiles-9-320-274.pbf')))
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
