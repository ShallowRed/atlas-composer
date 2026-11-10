import type { Selection } from 'd3'
import type { GeoProjection } from 'd3-geo'
import type { CompositeProjection } from '@/services/projection/composite-projection'
import type { ViewMode } from '@/types'
import { select } from 'd3'
import { logger } from '@/utils/logger'

const debug = logger.render.overlay

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface OverlayConfig {
  showBorders: boolean
  showLimits: boolean
  viewMode?: ViewMode
  width: number
  height: number
  customComposite?: CompositeProjection | null
  renderedProjection?: GeoProjection | null
  filteredTerritoryCodes?: Set<string>
}

export class MapOverlayService {
  static boundsToRect(bounds: [[number, number], [number, number]]): Rect {
    const [[x1, y1], [x2, y2]] = bounds
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    }
  }

  static computeSceneBBox(width: number, height: number, _inset: number = 0): Rect {
    return {
      x: 0,
      y: 0,
      width,
      height,
    }
  }

  static applyOverlays(svg: SVGSVGElement, config: OverlayConfig): void {
    if (!config.showBorders && !config.showLimits) {
      return
    }

    const overlayGroup = select(svg)
      .append('g')
      .classed('map-overlays', true)
      .attr('pointer-events', 'none')

    if (config.showBorders) {
      if (config.viewMode === 'composite-custom') {
        this.renderCustomCompositeBorders(overlayGroup, config)
      }
      else if (config.viewMode === 'built-in-composite') {
        this.renderExistingCompositeBorders(overlayGroup, config)
      }
    }

    if (config.showLimits) {
      const sceneBounds = this.computeSceneBBox(config.width, config.height)
      if (sceneBounds && sceneBounds.width > 0 && sceneBounds.height > 0) {
        this.renderMapLimits(overlayGroup, sceneBounds)
      }
    }

    if (overlayGroup.node()?.childNodes.length === 0) {
      overlayGroup.remove()
    }
  }

  private static compositionBorderStyle(
    selection: Selection<any, any, any, any>,
  ): void {
    selection
      .attr('class', 'composition-border')
      .attr('fill', 'none')
      .attr('stroke', ' color-mix(in oklch, var(--color-neutral) 50%, var(--color-base-100))')
      .attr('stroke-width', 1)
  }

  private static renderCustomCompositeBorders(
    overlayGroup: Selection<any, any, any, any>,
    config: OverlayConfig,
  ): void {
    const composite = config.customComposite
    if (!composite) {
      return
    }

    let borders = composite.getCompositionBorders(config.width, config.height)

    if (config.filteredTerritoryCodes) {
      borders = borders.filter(border =>
        config.filteredTerritoryCodes!.has(border.territoryCode),
      )
    }

    const validBorders = borders
      .map(border => this.boundsToRect(border.bounds))
      .filter(rect => rect.width > 0 && rect.height > 0)

    overlayGroup
      .selectAll('rect.composition-border')
      .data(validBorders)
      .join('rect')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width)
      .attr('height', d => d.height)

      .call(sel => this.compositionBorderStyle(sel))
  }

  private static renderExistingCompositeBorders(
    overlayGroup: Selection<any, any, any, any>,
    config: OverlayConfig,
  ): void {
    const projection = config.renderedProjection as (GeoProjection & { getCompositionBorders?: () => string }) | null | undefined
    const getBorders = projection?.getCompositionBorders
    if (typeof getBorders !== 'function') {
      return
    }

    let pathData: string
    try {
      pathData = getBorders.call(projection)
    }
    catch (err) {
      debug('Error getting composition borders: %O', err)
      return
    }

    if (pathData.length === 0) {
      return
    }

    overlayGroup
      .append('path')
      .attr('d', pathData)
      .call(sel => this.compositionBorderStyle(sel))
  }

  private static renderMapLimits(
    overlayGroup: Selection<any, any, any, any>,
    bounds: Rect,
  ): void {
    overlayGroup
      .append('rect')
      .attr('x', bounds.x)
      .attr('y', bounds.y)
      .attr('width', bounds.width)
      .attr('height', bounds.height)
      .attr('class', 'map-limits')
      .attr('stroke', 'var(--color-neutral)')
      .style('fill', 'none')
      .style('stroke-width', 2)
  }
}
