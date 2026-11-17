import type { InvertibleProjection } from '@/core/frames'
import { geoConicConformal, geoOrthographic } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { sampleTiles, tileOf, tilePositions } from '@/core/basemap'
import { invertOnGlobe } from '@/core/frames'
import { ProjectionFactory } from '@/core/projections/factory'

const SIZE = 4

// A tile of one gray level
const plainTile = (level: number) => new Uint8ClampedArray(SIZE * SIZE * 4).fill(level)

function read(tiles: Map<string, Uint8ClampedArray | null>, n: number, fx: number, fy: number): number | null {
  const out = new Uint8ClampedArray(4)
  return sampleTiles(tiles, n, SIZE)(fx, fy, out, 0) ? out[0]! : null
}

describe('sampleTiles', () => {
  const tiles = new Map([['0,0', plainTile(0)], ['1,0', plainTile(200)]])

  it('reads the exact color at the center of a pixel of tile', () => {
    expect(read(tiles, 2, 0.5 / SIZE, 0.5 / SIZE)).toBe(0)
    expect(read(tiles, 2, 1 + 1.5 / SIZE, 0.5 / SIZE)).toBe(200)
  })

  it('reads an intermediate color between two pixels on each side of the edge of two tiles', () => {
    expect(read(tiles, 2, 1, 0.5 / SIZE)).toBe(100)
  })

  it('reads the neighbor across the antimeridian', () => {
    expect(read(tiles, 2, 2 - 0.0001, 0.5 / SIZE)).toBeCloseTo(100, -1)
  })

  it('reads the edge pixel of the tile of the point when its neighbor is missing, and nothing in a missing tile', () => {
    const alone = new Map([['0,0', plainTile(80)]])
    expect(read(alone, 2, 1 - 0.0001, 0.5 / SIZE)).toBe(80)
    expect(read(alone, 2, 1.5, 0.5 / SIZE)).toBeNull()
  })
})

describe('tilePositions', () => {
  const zoom = 6
  const tileSize = 256

  // The positions of the grid, and their largest gap to the exact inverse, in pixels of tile
  function compare(projection: InvertibleProjection, width: number, height: number) {
    const visited = new Set<string>()
    let gap = 0
    const positions = tilePositions(projection, [[0, 0], [width, height]], { zoom, pixelRatio: 1, tileSize }, (px, py, fx, fy) => {
      visited.add(`${px},${py}`)
      const inverse = invertOnGlobe(projection, [px + 0.5, py + 0.5])
      if (inverse) {
        const [ex, ey] = tileOf(inverse, zoom)
        gap = Math.max(gap, Math.abs(ex - fx) * tileSize, Math.abs(ey - fy) * tileSize)
      }
    })
    while (!positions.next().done) { /* draw every row */ }
    const exact = new Set<string>()
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        if (invertOnGlobe(projection, [px + 0.5, py + 0.5])) {
          exact.add(`${px},${py}`)
        }
      }
    }
    return { gap, visited, exact }
  }

  it.each([
    ['a conic projection framed on France', geoConicConformal().rotate([-3, -46.5]).parallels([44, 49]).scale(2600).translate([200, 150])],
    ['an orthographic projection that shows the edge of the globe', geoOrthographic().rotate([-3, -46.5]).scale(120).translate([200, 150])],
    ['the built-in composite projection of France', ProjectionFactory.createById('conic-conformal-france')!.scale(2600).translate([200, 150])],
  ])('stays within an eighth of a pixel of tile of the exact inverse on %s, and visits the pixels of the globe only', (_, projection) => {
    const { gap, visited, exact } = compare(projection as InvertibleProjection, 400, 300)
    expect(gap).toBeLessThanOrEqual(1 / 8)
    expect([...visited].filter(pixel => !exact.has(pixel))).toEqual([])
    expect(visited.size).toBe(exact.size)
  })
})
