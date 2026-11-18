import type { SubProjectionEntry } from '../src'

import { geoConicEquidistant, geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { buildCompositeProjection, calculateClipExtentFromPixelOffset, invertWithBoundsValidation } from '../src'

const translate: [number, number] = [480, 250]

// A conic sub-projection whose clip extent is given in pixels from its translate, to build a frame inside another one
function conicEntry(
  id: string,
  rotate: [number, number, number],
  scale: number,
  offset: [number, number],
  pixelClipExtent: [number, number, number, number],
  bounds: [number, number, number, number],
): SubProjectionEntry {
  const center: [number, number] = [translate[0] + offset[0], translate[1] + offset[1]]
  const projection = geoConicEquidistant().rotate(rotate).parallels([34, 40]).scale(scale).translate(center)
  projection.clipExtent(calculateClipExtentFromPixelOffset(center, pixelClipExtent))
  const [minLon, minLat, maxLon, maxLat] = bounds
  return { id, projection, bounds: { minLon, minLat, maxLon, maxLat } }
}

const mainland = conicEntry('JP-MAIN', [-136, -22, 0], 2200, [0, 0], [-297.44, -240.02, 257.4, 215.6], [128.6, 30.2, 142, 41.6])

describe('invertWithBoundsValidation', () => {
  it('inverts Naha in the frame of the Ryukyu Islands, inside the frame of the mainland', () => {
    const composite = buildCompositeProjection({
      entries: [
        mainland,
        conicEntry('JP-RYU', [-126, -19, 0], 2200 * 0.7, [0, 0], [-87.78, 103.62, 112.2, 245.08], [123.6, 24.2, 129.8, 28.6]),
      ],
    })
    const naha: [number, number] = [127.68, 26.21]

    const [lon, lat] = composite.invert!(composite(naha)!)!

    expect(lon).toBeCloseTo(naha[0], 6)
    expect(lat).toBeCloseTo(naha[1], 6)
  })

  it('returns null for a pixel of a frame whose inverse leaves its bounds, over a frame whose bounds contain its inverse', () => {
    const entries = [
      mainland,
      conicEntry('JP-01', [-146, -26, 0], 2200, [-93.5, -11], [-203.5, -229.46, 6.16, -48.4], [139.4, 41.4, 145.9, 45.6]),
    ]

    expect(invertWithBoundsValidation([240, 188], [mainland])?.territoryId).toBe('JP-MAIN')
    expect(invertWithBoundsValidation([240, 188], entries)).toBeNull()
  })

  it('skips a sub-projection whose clip extent leaves out the pixel', () => {
    const entry = (id: string, clipExtent: [[number, number], [number, number]]): SubProjectionEntry => ({
      id,
      projection: geoMercator().scale(100).translate(translate).clipExtent(clipExtent),
      bounds: { minLon: -180, minLat: -80, maxLon: 180, maxLat: 80 },
    })
    const entries = [entry('left', [[0, 0], [480, 500]]), entry('right', [[480, 0], [960, 500]])]

    expect(invertWithBoundsValidation([100, 250], entries)?.territoryId).toBe('left')
  })
})
