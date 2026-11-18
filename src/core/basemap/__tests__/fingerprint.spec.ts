import type { Extent } from '@/core/frames'
import { geoConicConformal, geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { basemapFingerprint } from '@/core/basemap'

const OPTIONS = { width: 960, height: 500, pixelRatio: 2 }

function frame({ scale = 2700, translate = [480, 250] as [number, number], extent = [[200, 20], [760, 480]] as Extent } = {}) {
  return { projection: geoConicConformal().rotate([-3, 0]).parallels([44, 49]).center([0, 46.5]).scale(scale).translate(translate), extent }
}

const island = { projection: geoMercator().center([55.5, -21.1]).scale(9000).translate([80, 420]), extent: [[20, 360], [140, 480]] as Extent }

describe('fingerprint of a raster basemap', () => {
  it('is the same for the same frames, and keeps the source in front', () => {
    const fingerprint = basemapFingerprint('relief', [frame(), island], OPTIONS)
    expect(basemapFingerprint('relief', [frame(), island], OPTIONS)).toBe(fingerprint)
    expect(fingerprint).toMatch(/^relief-[a-z0-9]+$/)
  })

  it('stays the same for a gap far below its rounding', () => {
    expect(basemapFingerprint('relief', [frame({ translate: [480 + 1e-9, 250] })], OPTIONS)).toBe(basemapFingerprint('relief', [frame()], OPTIONS))
  })

  it.each([
    ['the scale of a frame', [frame({ scale: 2800 })], OPTIONS],
    ['the position of a frame', [frame({ translate: [481, 250] })], OPTIONS],
    ['the clip of a frame', [frame({ extent: [[200, 20], [700, 480]] })], OPTIONS],
    ['the pixel ratio', [frame()], { ...OPTIONS, pixelRatio: 1 }],
    ['the size of the canvas', [frame()], { ...OPTIONS, width: 800 }],
  ] as const)('changes with %s', (_, frames, options) => {
    expect(basemapFingerprint('relief', [...frames], options)).not.toBe(basemapFingerprint('relief', [frame()], OPTIONS))
  })

  it('changes with the order of the frames, since a frame drawn later covers the others', () => {
    expect(basemapFingerprint('relief', [island, frame()], OPTIONS)).not.toBe(basemapFingerprint('relief', [frame(), island], OPTIONS))
  })

  it('changes with the source', () => {
    expect(basemapFingerprint('imagery', [frame()], OPTIONS)).not.toBe(basemapFingerprint('relief', [frame()], OPTIONS))
  })
})
