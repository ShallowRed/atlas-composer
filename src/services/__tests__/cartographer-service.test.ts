import type { GeoDataConfig } from '@/types'
import { geoPath } from 'd3-geo'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Cartographer } from '@/services/rendering/cartographer-service'

describe('cartographer service integration', () => {
  let cartographer: Cartographer

  const mockGeoDataConfig: GeoDataConfig = {
    dataPath: '/data/france-territories-10m.json',
    metadataPath: '/data/france-metadata-10m.json',
    territories: [
      {
        code: 'FR-MET' as any,
        name: 'France Metropolitaine',
        center: [2.5, 46.5],
        bounds: [[-5, 41], [10, 51]],
      },
    ],
  }

  beforeEach(() => {
    cartographer = new Cartographer(mockGeoDataConfig)
  })

  describe('error handling', () => {
    it('should handle invalid render mode gracefully', async () => {
      await expect(async () => {
        await cartographer.render({
          mode: 'invalid-mode' as any,
          projection: 'mercator',
          width: 800,
          height: 600,
        } as any)
      }).rejects.toThrow('Unknown render mode')
    })
  })
})

describe('simplification of the territories at each render', () => {
  const config: GeoDataConfig = { dataPath: '/data/test-territories.json', metadataPath: '/data/test-metadata.json', territories: [] }
  // A square of 4 degrees with a notch of 1e-4 degree on its south side, a fraction of a pixel on a map of 800 pixels
  const ring = [[0, 0], [0, 4], [4, 4], [4, 0], [2.0001, 0], [2, 0.0001], [1.9999, 0], [0, 0]]
  const topology = {
    type: 'Topology',
    arcs: [ring],
    objects: { territories: { type: 'GeometryCollection', geometries: [{ type: 'Polygon', arcs: [[0]], properties: { code: 'XX', name: 'Test' } }] } },
  }

  async function loadedCartographer() {
    vi.stubGlobal('fetch', async (url: string) => new Response(JSON.stringify(url === config.dataPath ? topology : {})))
    const cartographer = new Cartographer(config)
    await cartographer.init()
    return cartographer
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('draws each territory simplified to the scale of its projection, and its borders as a mesh', async () => {
    const cartographer = await loadedCartographer()
    const geoData = await cartographer.geoData.getCompleteData()
    const { svg } = await cartographer.render({ mode: 'simple', geoData, projection: 'mercator', width: 800, height: 600 })
    const full = geoPath(cartographer.lastProjection!)(geoData.features[0]!)!
    const drawn = svg.querySelector('g.territories path[data-territory="XX"]')!.getAttribute('d')!
    const borders = [...svg.querySelectorAll('g.borders path')].map(path => path.getAttribute('d')!)

    expect(drawn.split('L').length).toBeLessThan(full.split('L').length)
    // A mesh is a line, without the closing command of a ring
    expect(borders).toHaveLength(1)
    expect(borders[0]).not.toContain('Z')
  })

  it('draws the outline of each territory, without mesh, in the composite-projection mode of a composite of d3-composite-projections', async () => {
    const cartographer = await loadedCartographer()
    const { svg } = await cartographer.render({ mode: 'composite-projection', territoryMode: 'all-territories', projection: 'mercator', width: 800, height: 600 })

    expect(svg.querySelector('g.borders path')!.getAttribute('d')).toContain('Z')
  })
})
