import type { Selection } from 'd3'
import type { CompositeProjection } from '@/services/projection/composite-projection'
import { path, select } from 'd3'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
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
  viewMode: 'composite-custom' | 'built-in-composite' | 'individual'
  projectionId?: string
  width: number
  height: number
  customComposite?: CompositeProjection | null
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

  static createCompositeBorderPath(
    projectionId: string | undefined,
    width: number,
    height: number,
    canvasDimensions?: { width: number, height: number },
  ): string | null {
    if (!projectionId) {
      return null
    }

    const definition = projectionRegistry.get(projectionId)
    if (!definition) {
      return null
    }

    const projection = ProjectionFactory.createById(projectionId)
    if (!projection) {
      return null
    }

    const customFit = definition.metadata?.customFit
    if (customFit) {
      const referenceWidth = canvasDimensions?.width ?? customFit.referenceWidth
      const scaleFactor = width / referenceWidth
      projection.scale(customFit.defaultScale * scaleFactor)
      projection.translate([width / 2, height / 2])
    }
    else {
      const defaultScale = 1000
      const referenceWidth = canvasDimensions?.width ?? 960
      if (typeof projection.scale === 'function') {
        const scaleFactor = width / referenceWidth
        projection.scale(defaultScale * scaleFactor)
      }
      if (typeof projection.translate === 'function') {
        projection.translate([width / 2, height / 2])
      }
    }

    const getBorders = (projection as any)?.getCompositionBorders
    if (typeof getBorders === 'function') {
      try {
        const pathString = getBorders.call(projection)
        return pathString.length > 0 ? pathString : null
      }
      catch (err) {
        debug('Error getting composition borders: %O', err)
      }
    }

    const drawBorders = (projection as any)?.drawCompositionBorders
    if (typeof drawBorders !== 'function') {
      return null
    }

    const pathBuilder = path()

    try {
      drawBorders.call(projection, pathBuilder)
      const pathString = pathBuilder.toString()
      return pathString.length > 0 ? pathString : null
    }
    catch (err) {
      debug('Error drawing composition borders: %O', err)
      return null
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

    composite.build(config.width, config.height, true)
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
    const overlayProjectionId = config.projectionId
    if (!overlayProjectionId) {
      return
    }

    const pathData = this.createCompositeBorderPath(
      overlayProjectionId,
      config.width,
      config.height,
    )

    if (!pathData) {
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
