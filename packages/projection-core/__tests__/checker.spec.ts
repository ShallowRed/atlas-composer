import type { GeoBounds } from '../src'

import { describe, expect, it } from 'vitest'
import { isPointInBounds } from '../src'

const ordinary: GeoBounds = { minLon: -10, minLat: 40, maxLon: 10, maxLat: 50 }
const acrossAntimeridian: GeoBounds = { minLon: 174.5, minLat: -21.8, maxLon: -178.2, maxLat: -12.4 }

describe('isPointInBounds', () => {
  it.each([
    ['inside a box', ordinary, [0, 45], 0, true],
    ['on the western edge of a box', ordinary, [-10, 45], 0, true],
    ['west of a box', ordinary, [-10.05, 45], 0, false],
    ['west of a box within the tolerance', ordinary, [-10.05, 45], 0.1, true],
    ['north of a box', ordinary, [0, 50.5], 0, false],
    ['east of the antimeridian in a box across it', acrossAntimeridian, [179.9, -16.5], 0, true],
    ['west of the antimeridian in a box across it', acrossAntimeridian, [-179.9, -16.5], 0, true],
    ['at 180 in a box across the antimeridian', acrossAntimeridian, [180, -16.5], 0, true],
    ['at -180 in a box across the antimeridian', acrossAntimeridian, [-180, -16.5], 0, true],
    ['between the edges of a box across the antimeridian', acrossAntimeridian, [0, -16.5], 0, false],
    ['east of the eastern edge of a box across the antimeridian', acrossAntimeridian, [-178.15, -16.5], 0, false],
    ['east of the eastern edge of a box across the antimeridian within the tolerance', acrossAntimeridian, [-178.15, -16.5], 0.1, true],
    ['south of a box across the antimeridian', acrossAntimeridian, [179.9, -22], 0, false],
  ] as const)('tells a point %s', (_case, bounds, [lon, lat], tolerance, inside) => {
    expect(isPointInBounds(lon, lat, bounds, tolerance)).toBe(inside)
  })
})
