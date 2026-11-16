import type { GeoProjection } from 'd3-geo'
import type { CompositeProjection } from '@/services/projection/composite-projection'
import type { ViewMode } from '@/types'
import { geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { GraticuleOverlayService } from '@/services/rendering/graticule-overlay-service'

const emptyComposite = { getAllSubProjectionData: () => [], getCompositionBorders: () => [] } as unknown as CompositeProjection

function graticulePaths(viewMode: ViewMode, options: { withProjection: boolean, customComposite?: CompositeProjection }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  GraticuleOverlayService.applyGraticuleOverlays(svg, {
    showGraticule: true,
    width: 800,
    height: 600,
    viewMode,
    projectionId: 'mercator',
    // The coordinator passes the projection of the last render, which is null when nothing was drawn
    projection: (options.withProjection ? geoMercator().fitSize([800, 600], { type: 'Sphere' }) : undefined) as GeoProjection,
    customComposite: options.customComposite,
  })
  return svg.querySelectorAll('.graticule-overlays path').length
}

describe('graticule of a custom composite without an active territory', () => {
  it('draws the graticule of a simple projection', () => {
    expect(graticulePaths('unified', { withProjection: true })).toBeGreaterThan(0)
  })

  it.each([true, false])('draws nothing, with a rendered projection: %s', (withProjection) => {
    expect(graticulePaths('composite-custom', { withProjection, customComposite: emptyComposite })).toBe(0)
  })
})
