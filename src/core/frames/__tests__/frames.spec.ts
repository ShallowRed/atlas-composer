import type { ProjectionFrame } from '@/core/frames'
import { geoConicConformal, geoNaturalEarth1, geoOrthographic } from 'd3-geo'
import { geoRobinson } from 'd3-geo-projection'
import { describe, expect, it } from 'vitest'
import { frameMapping, invertOnGlobe, provisionalPlacements } from '@/core/frames'
import { ProjectionFactory } from '@/core/projections/factory'

describe('invertOnGlobe', () => {
  const world = geoRobinson().fitSize([960, 500], { type: 'Sphere' })

  it('inverts a pixel of the globe and refuses a corner outside it', () => {
    expect(invertOnGlobe(world, [480, 250])).not.toBeNull()
    expect(invertOnGlobe(world, [2, 2])).toBeNull()
  })

  it('refuses a pixel above the globe whose inverse lies beyond a pole', () => {
    const naturalEarth = geoNaturalEarth1().scale(150).translate([480, 250])
    expect(naturalEarth.invert!([480, 7.5])![1]).toBeLessThan(-90)
    expect(invertOnGlobe(naturalEarth, [480, 7.5])).toBeNull()
    expect(invertOnGlobe(naturalEarth, [480, 250])).not.toBeNull()
  })
})

function conicFrame(code: string, change: (projection: ReturnType<typeof geoConicConformal>) => void = () => {}): ProjectionFrame {
  const projection = geoConicConformal().rotate([-3, -46.5]).parallels([44, 49]).scale(2600).translate([300, 250])
  change(projection)
  return { code, projection, extent: [[100, 50], [500, 450]] }
}

describe('frameMapping', () => {
  it('gives a translation of scale 1 for a frame that only moved', () => {
    const mapping = frameMapping(conicFrame('FR'), conicFrame('FR', projection => projection.translate([340, 230])))
    expect(mapping?.k).toBeCloseTo(1, 6)
    expect(mapping?.t[0]).toBeCloseTo(40, 3)
    expect(mapping?.t[1]).toBeCloseTo(-20, 3)
  })

  it('gives a scaling around the translation of the projection for a frame whose scale changed', () => {
    const mapping = frameMapping(conicFrame('FR'), conicFrame('FR', projection => projection.scale(3900)))
    expect(mapping?.k).toBeCloseTo(1.5, 6)
    expect(mapping?.t[0]).toBeCloseTo(300 - 1.5 * 300, 3)
    expect(mapping?.t[1]).toBeCloseTo(250 - 1.5 * 250, 3)
  })

  // d3 draws the center of a projection at its translation: another center moves the map without changing its shape
  it('gives a translation for another center', () => {
    const mapping = frameMapping(conicFrame('FR'), conicFrame('FR', projection => projection.center([0, 2])))
    expect(mapping?.k).toBeCloseTo(1, 6)
    expect(Math.hypot(...mapping!.t)).toBeGreaterThan(1)
  })

  it.each([
    ['a rotation', (projection: ReturnType<typeof geoConicConformal>) => projection.rotate([-10, -46.5])],
    ['another clip angle', (projection: ReturnType<typeof geoConicConformal>) => projection.clipAngle(60)],
  ])('gives no mapping for %s', (_, change) => {
    expect(frameMapping(conicFrame('FR'), conicFrame('FR', change))).toBeNull()
  })

  it('gives no mapping for other parallels on a frame large enough to show the difference', () => {
    const europe = (parallels: [number, number]): ProjectionFrame => ({ code: 'EU', projection: geoConicConformal().rotate([-10, -50]).parallels(parallels).scale(700).translate([300, 250]), extent: [[0, 0], [600, 500]] })
    expect(frameMapping(europe([40, 60]), europe([30, 70]))).toBeNull()
  })

  it('gives no mapping for another projection', () => {
    const other: ProjectionFrame = { code: 'FR', projection: geoOrthographic().rotate([-3, -46.5]).scale(2600).translate([300, 250]), extent: [[100, 50], [500, 450]] }
    expect(frameMapping(conicFrame('FR'), other)).toBeNull()
  })

  it('gives a translation for a built-in composite projection that only moved', () => {
    const france = (translate: [number, number]): ProjectionFrame => ({ code: '*', projection: ProjectionFactory.createById('conic-conformal-france')!.scale(2600).translate(translate), extent: [[0, 0], [600, 500]] })
    const mapping = frameMapping(france([300, 250]), france([340, 230]))
    expect(mapping?.k).toBeCloseTo(1, 6)
    expect(mapping?.t[0]).toBeCloseTo(40, 3)
    expect(mapping?.t[1]).toBeCloseTo(-20, 3)
  })

  it('finds the mapping of a frame whose corners are off the globe', () => {
    const globe = (translate: [number, number]): ProjectionFrame => ({ code: '*', projection: geoOrthographic().scale(240).translate(translate), extent: [[0, 0], [600, 500]] })
    const mapping = frameMapping(globe([300, 250]), globe([310, 250]))
    expect(mapping?.k).toBeCloseTo(1, 6)
    expect(mapping?.t[0]).toBeCloseTo(10, 3)
  })
})

describe('provisionalPlacements', () => {
  it('pairs the frames by code, and places the part of the previous image that each current frame shows', () => {
    const moved = conicFrame('FR', projection => projection.translate([340, 230]))
    moved.extent = [[140, 30], [540, 430]]
    const placements = provisionalPlacements([conicFrame('FR'), conicFrame('RE')], [moved, conicFrame('GP')])
    expect(placements).toHaveLength(1)
    const [placement] = placements
    expect(placement!.code).toBe('FR')
    placement!.to.flat().forEach((value, index) => expect(value).toBeCloseTo([140, 30, 540, 430][index]!, 3))
    placement!.from.flat().forEach((value, index) => expect(value).toBeCloseTo([100, 50, 500, 450][index]!, 3))
  })
})
