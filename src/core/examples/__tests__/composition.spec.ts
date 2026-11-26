import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import { describe, expect, it } from 'vitest'
import { readAtlasConfig, readCompositionDemoInput } from '@/__tests__/test-utils'
import { findPresetById } from '@/core/atlases/registry'
import { COMPOSITION_PRESETS, interpolate, locate, territoryOf } from '@/core/examples'
import { renderCompositionDemo } from '@/services/rendering/composition-demo'

describe('interpolate', () => {
  it('gives the start at 0, the end at 1, and a point of the segment between', () => {
    expect(interpolate([10, 20], [30, 60], 0)).toEqual([10, 20])
    expect(interpolate([10, 20], [30, 60], 1)).toEqual([30, 60])
    expect(interpolate([10, 20], [30, 60], 0.25)).toEqual([15, 30])
  })
})

describe('territoryOf', () => {
  const input = readCompositionDemoInput('japan-standard')

  it('takes the territory whose contour contains the point, else the one whose bounds contain it', () => {
    expect(territoryOf(input.config, input.territories.features, [139.749, 35.687])).toBe('JP-MAIN')
    expect(territoryOf(input.config, input.territories.features, [129.008, 35.097])).toBe('JP-MAIN')
    expect(territoryOf(input.config, input.territories.features, [0, 0])).toBeNull()
  })

  it('reads bounds whose minLon exceeds maxLon as crossing the antimeridian', () => {
    // A square on each side of the antimeridian
    const square = (west: number, east: number): GeoJSON.Polygon => ({ type: 'Polygon', coordinates: [[[west, -18], [west, -16], [east, -16], [east, -18], [west, -18]]] })
    const contour = { type: 'Feature' as const, properties: { code: 'FJ', iso: 'FJI' }, geometry: { type: 'MultiPolygon' as const, coordinates: [square(177, 179).coordinates, square(-179.5, -178.5).coordinates] } }
    const config: CompositeProjectionConfig = { ...input.config, territories: [{ ...input.config.territories[0]!, code: 'FJ', bounds: [[174.5, -21.8], [-178.2, -12.4]] }] }

    expect(territoryOf(config, [contour], [-179.9, -20])).toBe('FJ')
    expect(territoryOf(config, [contour], [179.9, -20])).toBe('FJ')
    expect(territoryOf(config, [contour], [-170, -20])).toBeNull()
  })
})

describe('locate', () => {
  const input = readCompositionDemoInput('japan-standard')
  const demo = renderCompositionDemo(input, [])
  const pixelOf = (code: string, point: [number, number]) => demo.frames.find(frame => frame.code === code)!.projection(point)!

  it.each([
    ['Tokyo', 'JP-MAIN', [139.749, 35.687]],
    ['Sapporo', 'JP-01', [141.34, 43.07]],
    ['Naha', 'JP-RYU', [127.673, 26.207]],
  ] as const)('gives back the point and the territory under the pixel of %s', (_name, code, point) => {
    const location = locate(demo.frames, input.territories.features, pixelOf(code, [...point]))

    expect(location?.territory).toBe(code)
    expect(location?.longitude).toBeCloseTo(point[0], 3)
    expect(location?.latitude).toBeCloseTo(point[1], 3)
  })

  it('gives the point without territory in a frame outside the contour of its territory, and nothing outside the frames', () => {
    const busan: [number, number] = [129.008, 35.097]
    const location = locate(demo.frames, input.territories.features, pixelOf('JP-MAIN', busan))

    expect(location?.territory).toBeNull()
    expect(location?.longitude).toBeCloseTo(busan[0], 3)
    expect(location?.latitude).toBeCloseTo(busan[1], 3)
    expect(locate(demo.frames, input.territories.features, [1, 1])).toBeNull()
  })
})

describe('composition presets', () => {
  it.each(COMPOSITION_PRESETS)('%s is a composite-custom preset whose atlas declares a contours file', (presetId) => {
    const found = findPresetById(presetId)
    expect(found?.preset.type).toBe('composite-custom')
    const atlas = readAtlasConfig<{ dataSources?: { territories?: string } }>(found!.atlasId)
    expect(atlas.dataSources?.territories).toMatch(/-territories-10m\.json$/)
  })
})
