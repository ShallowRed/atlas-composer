import type { SubProjectionEntry } from '../src'

import { geoConicEquidistant, geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { buildCompositeProjection, calculateClipExtentFromPixelOffset, invertWithBoundsValidation } from '../src'

const translate: [number, number] = [480, 250]

// The mainland and the Ryukyu Islands of the japan-standard preset, at its reference scale
function japanEntry(
  id: string,
  rotate: [number, number, number],
  scale: number,
  pixelClipExtent: [number, number, number, number],
  bounds: [number, number, number, number],
): SubProjectionEntry {
  const projection = geoConicEquidistant().rotate(rotate).parallels([34, 40]).scale(scale).translate(translate)
  projection.clipExtent(calculateClipExtentFromPixelOffset(translate, pixelClipExtent))
  const [minLon, minLat, maxLon, maxLat] = bounds
  return { id, projection, bounds: { minLon, minLat, maxLon, maxLat } }
}

describe('invertWithBoundsValidation', () => {
  it('inverts Naha in the Ryukyu Islands, whose frame the frame of the mainland contains', () => {
    const composite = buildCompositeProjection({
      entries: [
        japanEntry('JP-MAIN', [-136, -22, 0], 2200, [-297.44, -240.02, 257.4, 215.6], [128.6, 30.2, 142, 41.6]),
        japanEntry('JP-RYU', [-126, -19, 0], 2200 * 0.7, [-87.78, 103.62, 112.2, 245.08], [123.6, 24.2, 129.8, 28.6]),
      ],
    })
    const naha: [number, number] = [127.68, 26.21]

    const [lon, lat] = composite.invert!(composite(naha)!)!

    expect(lon).toBeCloseTo(naha[0], 6)
    expect(lat).toBeCloseTo(naha[1], 6)
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
