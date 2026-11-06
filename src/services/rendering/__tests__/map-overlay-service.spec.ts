import type { GeoProjection } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { MapOverlayService } from '@/services/rendering/map-overlay-service'

function render(renderedProjection?: GeoProjection) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  MapOverlayService.applyOverlays(svg, {
    showBorders: true,
    showLimits: false,
    viewMode: 'built-in-composite',
    width: 800,
    height: 600,
    renderedProjection,
  })
  return svg.querySelector('path.composition-border')
}

describe('composition borders of a built-in composite projection', () => {
  it('draws the borders of the rendered projection', () => {
    const projection = { getCompositionBorders: () => 'M10,20L30,40' } as unknown as GeoProjection

    expect(render(projection)?.getAttribute('d')).toBe('M10,20L30,40')
  })

  it('draws no border without a rendered projection', () => {
    expect(render()).toBeNull()
  })
})
