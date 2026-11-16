import type { GeoProjection } from 'd3-geo'
import type { ViewMode } from '@/types'
import { geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { GraticuleOverlayService } from '@/services/rendering/graticule-overlay-service'

const parameters = { getEffectiveParameters: () => ({}), getExportableParameters: () => ({}) }
const emptyComposite = new CompositeProjection({ territories: [] }, parameters, { getActiveTerritoryCodes: () => new Set() })

function graticulePaths(viewMode: ViewMode, options: { withProjection: boolean, customComposite?: CompositeProjection }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  GraticuleOverlayService.applyGraticuleOverlays(svg, {
    showGraticule: true,
    width: 800,
    height: 600,
    viewMode,
    projectionId: 'mercator',
    // The coordinator passes the projection of the last render, which is undefined when nothing was drawn
    projection: (options.withProjection ? geoMercator().fitSize([800, 600], { type: 'Sphere' }) : undefined) as GeoProjection,
    customComposite: options.customComposite,
  })
  return svg.querySelectorAll('.graticule-overlays path').length
}

describe('graticule overlay', () => {
  it('draws the graticule of a simple projection', () => {
    expect(graticulePaths('unified', { withProjection: true })).toBeGreaterThan(0)
  })

  it.each([true, false])('draws nothing for a custom composite without an active territory, with a rendered projection: %s', (withProjection) => {
    expect(graticulePaths('composite-custom', { withProjection, customComposite: emptyComposite })).toBe(0)
  })
})
