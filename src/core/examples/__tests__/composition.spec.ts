import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readCompositionDemoInput } from '@/__tests__/test-utils'
import { findPresetById, getAtlasConfigPath } from '@/core/atlases/registry'
import { COMPOSITION_PRESETS, interpolate, locate } from '@/core/examples'
import { renderCompositionDemo } from '@/services/rendering/composition-demo'

describe('interpolate', () => {
  it('gives the start at 0, the end at 1, and a point of the segment between', () => {
    expect(interpolate([10, 20], [30, 60], 0)).toEqual([10, 20])
    expect(interpolate([10, 20], [30, 60], 1)).toEqual([30, 60])
    expect(interpolate([10, 20], [30, 60], 0.25)).toEqual([15, 30])
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
    const atlas = JSON.parse(readFileSync(`configs/${getAtlasConfigPath(found!.atlasId)!.replace('./', '')}`, 'utf8')) as { dataSources?: { territories?: string } }
    expect(existsSync(`src/public/data/${atlas.dataSources?.territories}`)).toBe(true)
  })
})
