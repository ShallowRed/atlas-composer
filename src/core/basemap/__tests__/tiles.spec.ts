import type { JSONAtlasConfig } from '#types'
import type { Extent, InvertibleProjection } from '@/core/basemap'
import { readFileSync } from 'node:fs'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import { geoEquirectangular, geoMercator, geoNaturalEarth1 } from 'd3-geo'
import { geoRobinson } from 'd3-geo-projection'
import { describe, expect, it } from 'vitest'
import { readCompositeSources } from '@/__tests__/test-utils'
import { invertOnGlobe, tileOf, tilesForFrame, visibleLabels, zoomForFrame } from '@/core/basemap'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionCategory } from '@/core/projections/types'

const tile = (point: [number, number], zoom: number) => tileOf(point, zoom).map(Math.floor)

function framesOf(config: ReturnType<typeof readCompositeSources>[number]['config']) {
  const loader = new ProjectionLoader()
  loader.registerAll(d3ProjectionFactories)
  const { width, height } = config.canvasDimensions
  return [...loader.createSubProjections(config, { scale: config.referenceScale, translate: [width / 2, height / 2] })]
    .map(([code, projection]) => ({ code, projection, extent: (projection.clipExtent?.() ?? [[0, 0], [width, height]]) as Extent }))
}

function interiorTiles(projection: InvertibleProjection, [[x0, y0], [x1, y1]]: Extent, zoom: number, step: number): Set<string> {
  const tiles = new Set<string>()
  for (let x = x0 + step / 2; x < x1; x += step) {
    for (let y = y0 + step / 2; y < y1; y += step) {
      const inverse = invertOnGlobe(projection, [x, y])
      if (inverse) {
        tiles.add(tile(inverse, zoom).join(','))
      }
    }
  }
  return tiles
}

describe('tileOf', () => {
  it('places a point in the Web Mercator tile grid', () => {
    expect(tile([2.35, 48.85], 5)).toEqual([16, 11])
    expect(tile([166.45, -22.27], 4)).toEqual([15, 9])
    expect(tile([179.9, 0], 3)[0]).toBe(7)
    expect(tile([-179.9, 0], 3)[0]).toBe(0)
  })
})

describe('zoomForFrame', () => {
  const projection = geoMercator().scale(1000).translate([480, 250])
  const extent: Extent = [[0, 0], [960, 500]]

  // A pixel of a Mercator projection of scale s covers 1 / (2π s) of the square, a tile pixel at zoom z 1 / (256 × 2^z)
  it('chooses the smallest zoom whose tile pixel covers at most one canvas pixel', () => {
    expect(zoomForFrame(projection, extent, 1, 256, 20)).toBe(Math.ceil(Math.log2(2 * Math.PI * 1000 / 256)))
    expect(zoomForFrame(projection, extent, 2, 256, 20)).toBe(Math.ceil(Math.log2(2 * Math.PI * 2000 / 256)))
  })

  // The corners of a world map fall outside the globe or beyond the Web Mercator latitudes: only the center is measured.
  // There, a pixel of the equirectangular map covers 1 / 960 of the square (zoom 2), and a pixel of the Robinson map about 1 / (2π × 173) (zoom 3)
  it.each([['equirectangular', geoEquirectangular(), 2], ['Robinson', geoRobinson(), 3]] as const)('reads the zoom of a %s world map at its center', (_name, world, zoom) => {
    world.fitSize([960, 500], { type: 'Sphere' })
    expect(zoomForFrame(world, [[0, 0], [960, 500]], 1, 256, 20)).toBe(zoom)
  })

  it('stays within the maximal zoom of the source', () => {
    expect(zoomForFrame(projection, extent, 2, 256, 3)).toBe(3)
  })
})

describe('tilesForFrame', () => {
  it.each(readCompositeSources().flatMap(source => framesOf(source.config).map(frame => [`${source.id} ${frame.code}`, frame] as const)))('%s covers each pixel of its frame', (_name, { projection, extent }) => {
    const zoom = 5
    const tiles = new Set(tilesForFrame(projection, extent, zoom).map(t => t.join(',')))
    for (const key of interiorTiles(projection, extent, zoom, 8)) {
      expect(tiles.has(key), key).toBe(true)
    }
  })

  // A built-in composite draws its insets inside one projection, away from the edges of the canvas: each tile that covers 16 pixels or more of the canvas is requested
  it.each(projectionRegistry.getAll().filter(definition => definition.category === ProjectionCategory.COMPOSITE).map(definition => [definition.id, definition] as const))('%s covers its insets', (_id, definition) => {
    const projection = definition.create()
    const extent: Extent = [[0, 0], [960, 500]]
    const zoom = 5
    const tiles = new Set(tilesForFrame(projection, extent, zoom).map(t => t.join(',')))
    const samples = new Map<string, number>()
    for (let x = 1; x < 960; x += 2) {
      for (let y = 1; y < 500; y += 2) {
        const inverse = invertOnGlobe(projection, [x, y])
        if (inverse) {
          const key = tile(inverse, zoom).join(',')
          samples.set(key, (samples.get(key) ?? 0) + 1)
        }
      }
    }
    for (const [key, count] of samples) {
      if (count >= 4) {
        expect(tiles.has(key), `${key}, ${count * 4} pixels`).toBe(true)
      }
    }
  })

  // No preset draws US-ALEU, whose bounds in configs/atlases/usa.json cross the antimeridian: its frame is a Mercator fitted to them
  it('covers the Aleutian Islands across the antimeridian with few tiles', () => {
    const { territories } = JSON.parse(readFileSync('configs/atlases/usa.json', 'utf8')) as JSONAtlasConfig
    const [[west, south], [east, north]] = (Array.isArray(territories) ? territories : []).find(territory => territory.code === 'US-ALEU')!.bounds!
    const extent: Extent = [[0, 0], [400, 200]]
    const aleutians = geoMercator().rotate([180, 0]).fitExtent(extent, { type: 'MultiPoint', coordinates: [[west, south], [east, north]] })
    const zoom = 6
    const covered = interiorTiles(aleutians, extent, zoom, 1).size
    const tiles = tilesForFrame(aleutians, extent, zoom)
    expect(tiles.length).toBeLessThanOrEqual(2 * covered)
    expect(tiles.length).toBeGreaterThanOrEqual(covered)
  })

  it('reaches every longitude when the frame contains a pole', () => {
    const world = geoNaturalEarth1().fitSize([960, 500], { type: 'Sphere' })
    const tiles = tilesForFrame(world, [[0, 0], [960, 500]], 2)
    expect(tiles).toHaveLength(16)
  })
})

describe('invertOnGlobe', () => {
  const world = geoRobinson().fitSize([960, 500], { type: 'Sphere' })

  it('inverts a pixel of the globe and refuses a corner outside it', () => {
    expect(invertOnGlobe(world, [480, 250])).not.toBeNull()
    expect(invertOnGlobe(world, [2, 2])).toBeNull()
  })
})

describe('visibleLabels', () => {
  it('drops the labels that a frame drawn later covers', () => {
    const frames: Array<{ extent: Extent }> = [{ extent: [[0, 0], [100, 100]] }, { extent: [[0, 0], [40, 40]] }]
    const labels = [{ frame: 0, x: 20, y: 20 }, { frame: 0, x: 80, y: 80 }, { frame: 1, x: 20, y: 20 }]
    expect(visibleLabels(labels, frames)).toEqual([{ frame: 0, x: 80, y: 80 }, { frame: 1, x: 20, y: 20 }])
  })
})
