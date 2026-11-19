import type { SubProjectionEntry } from '../src'

import { geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { invertWithBoundsValidation } from '../src'

const translate: [number, number] = [480, 250]

function entry(id: string, clipExtent?: [[number, number], [number, number]]): SubProjectionEntry {
  const projection = geoMercator().scale(100).translate(translate)
  if (clipExtent) {
    projection.clipExtent(clipExtent)
  }
  return { id, projection, bounds: { minLon: -180, minLat: -80, maxLon: 180, maxLat: 80 } }
}

describe('invertWithBoundsValidation', () => {
  it('skips a sub-projection whose clip extent leaves out the pixel', () => {
    const entries = [entry('left', [[0, 0], [480, 500]]), entry('right', [[480, 0], [960, 500]])]

    expect(invertWithBoundsValidation([100, 250], entries)?.territoryId).toBe('left')
  })

  it('inverts a pixel of a frame inside another frame in the sub-projection drawn after', () => {
    const entries = [entry('outer', [[0, 0], [960, 500]]), entry('inner', [[400, 200], [560, 300]])]

    expect(invertWithBoundsValidation([480, 250], entries)?.territoryId).toBe('inner')
    expect(invertWithBoundsValidation([100, 250], entries)?.territoryId).toBe('outer')
  })

  it('inverts a pixel in the last sub-projection when it has no clip extent', () => {
    const entries = [entry('framed', [[0, 0], [480, 500]]), entry('unframed')]

    expect(invertWithBoundsValidation([100, 250], entries)?.territoryId).toBe('unframed')
  })
})
