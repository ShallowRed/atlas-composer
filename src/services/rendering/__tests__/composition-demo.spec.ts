import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { Earthquake } from '@/core/examples'
import { describe, expect, it } from 'vitest'
import { readCompositionDemoInput as demoInput } from '@/__tests__/test-utils'
import { renderCompositionDemo } from '@/services/rendering/composition-demo'

const earthquake = (longitude: number, latitude: number): Earthquake => ({ longitude, latitude, magnitude: 4, label: `${longitude}, ${latitude}`, time: 0 })

function firstVertex(geometry: GeoJSON.Geometry): [number, number] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0]![0] as [number, number]
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates[0]![0]![0] as [number, number]
  }
  throw new Error(`No polygon: ${geometry.type}`)
}

function firstPoint(path: string): [number, number] {
  const [x, y] = path.match(/^M([\d.e-]+),([\d.e-]+)/)!.slice(1).map(Number)
  return [x!, y!]
}

describe('renderCompositionDemo', () => {
  it('keeps the places of the countries of the contours only', () => {
    const labels = (presetId: string) => new Set(renderCompositionDemo(demoInput(presetId), []).marks.map(({ label }) => label))
    const norway = labels('norway-standard')
    const swedishAndFinnish = demoInput('norway-standard').places.filter(place => place[5] === 'SWE' || place[5] === 'FIN').map(place => place[3])

    expect(swedishAndFinnish.filter(name => norway.has(name))).toEqual([])
    expect(norway).toContain('Tromsø')
    expect(norway).toContain('Longyearbyen')
    expect(labels('portugal-standard')).toContain('Lisbon')
    expect(renderCompositionDemo(demoInput('france-standard'), []).marks.find(({ label }) => label === 'Fort-de-France')?.territory).toBe('FR-MQ')
  })

  it('draws each vertex of a territory at its raw position, then at its place through the sub-projection of its code', () => {
    const input = demoInput('japan-standard')
    const demo = renderCompositionDemo(input, [])
    const projectionOf = new Map(demo.frames.map(({ code, projection }) => [code, projection]))
    const shapes = demo.territoriesAt(1)

    expect(shapes.map(({ code }) => code)).not.toContain('JP-OGA')
    expect(shapes.map(({ code }) => code).sort()).toEqual(['JP-01', 'JP-MAIN', 'JP-RYU'])
    for (const { code, path } of shapes) {
      const contour = input.territories.features.find(({ properties }) => properties.code === code)!
      const [x, y] = projectionOf.get(code)!(firstVertex(contour.geometry))!
      const [px, py] = firstPoint(path)
      expect(px).toBeCloseTo(x, 2)
      expect(py).toBeCloseTo(y, 2)
    }
  })

  it('draws a vertex halfway at half progress', () => {
    const demo = renderCompositionDemo(demoInput('japan-standard'), [])
    const [x0, y0] = firstPoint(demo.territoriesAt(0)[0]!.path)
    const [x1, y1] = firstPoint(demo.territoriesAt(1)[0]!.path)
    const [xh, yh] = firstPoint(demo.territoriesAt(0.5)[0]!.path)

    expect(xh).toBeCloseTo((x0 + x1) / 2, 2)
    expect(yh).toBeCloseTo((y0 + y1) / 2, 2)
  })

  it('draws each mark in the frame of its territory, through the sub-projection of that territory', () => {
    // Matsumae, in Hokkaidō, south of 41.6° N: inside the bounds of JP-MAIN, inside the contour of JP-01
    const matsumae = earthquake(140.11, 41.43)
    // Chichi-jima, in the Ogasawara Islands, which japan-standard leaves out
    const chichijima = earthquake(142.19, 27.07)
    const demo = renderCompositionDemo(demoInput('japan-standard'), [matsumae, chichijima])
    const frameOf = new Map(demo.frames.map(frame => [frame.code, frame]))

    expect(demo.marks.length).toBeGreaterThan(50)
    for (const mark of demo.marks) {
      const { extent: [[x0, y0], [x1, y1]] } = frameOf.get(mark.territory)!
      const [x, y] = mark.composite
      expect(x >= x0 && x <= x1 && y >= y0 && y <= y1).toBe(true)
    }
    const inHokkaido = demo.marks.find(({ label }) => label === matsumae.label)!
    expect(inHokkaido.territory).toBe('JP-01')
    expect(inHokkaido.composite).toEqual(frameOf.get('JP-01')!.projection([matsumae.longitude, matsumae.latitude]))
    expect(demo.marks.find(({ label }) => label === chichijima.label)).toBeUndefined()
    expect(demo.marks.some(({ territory }) => territory === 'JP-OGA')).toBe(false)
  })

  it('leaves out a mark whose composite position is outside the frame of its territory', () => {
    const input = demoInput('japan-standard')
    expect(renderCompositionDemo(input, []).marks.find(({ label }) => label === 'Naha')?.territory).toBe('JP-RYU')
    const config = input.config as CompositeProjectionConfig & { territories: Array<{ code: string, layout: { pixelClipExtent?: number[] } }> }
    // A frame of JP-RYU in the corner of its rectangle, away from Naha
    config.territories.find(({ code }) => code === 'JP-RYU')!.layout.pixelClipExtent = [100, 230, 112, 245]

    const demo = renderCompositionDemo(input, [])

    expect(demo.marks.find(({ label }) => label === 'Naha')).toBeUndefined()
  })
})
