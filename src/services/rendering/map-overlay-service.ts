import type { Selection } from 'd3'
import type { CompositeProjection } from '@/services/projection/composite-projection'
import { path, select } from 'd3'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { logger } from '@/utils/logger'

const debug = logger.render.overlay

/**
 * Rectangle bounds in SVG coordinate space
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Configuration for overlay rendering
 */
export interface OverlayConfig {
  showBorders: boolean
  showLimits: boolean
  viewMode: 'composite-custom' | 'built-in-composite' | 'individual'
  projectionId?: string
  width: number
  height: number
  customComposite?: CompositeProjection | null
  isMainland?: boolean
  filteredTerritoryCodes?: Set<string>
}

/**
 * MapOverlayService
 *
 * Handles rendering of map overlays (composition borders and map limits)
 * Uses D3 selection and path APIs for SVG manipulation
 */
export class MapOverlayService {
  /**
   * Convert projection bounds to SVG rectangle
   */
  static boundsToRect(bounds: [[number, number], [number, number]]): Rect {
    const [[x1, y1], [x2, y2]] = bounds
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    }
  }

  /**
   * Compute bounding box for the full SVG viewport
   *
   * NOTE: Inset functionality is disabled. Projections render to full dimensions.
   */
  static computeSceneBBox(width: number, height: number, _inset: number = 0): Rect {
    return {
      x: 0,
      y: 0,
      width,
      height,
    }
  }

  /**
   * Create path data for composite projection borders
   * Uses d3-composite-projections API (getCompositionBorders or drawCompositionBorders)
   */
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

    // Apply scale and translation to match the rendered map
    const customFit = definition.metadata?.customFit
    if (customFit) {
      // Use preset canvas dimensions if available, otherwise fall back to customFit metadata
      const referenceWidth = canvasDimensions?.width ?? customFit.referenceWidth
      const scaleFactor = width / referenceWidth
      projection.scale(customFit.defaultScale * scaleFactor)
      projection.translate([width / 2, height / 2])
    }
    else {
      // For projections without customFit, scale proportionally from a reference size
      // d3-composite-projections default to scale 1000 at 960px width
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

    // Try getCompositionBorders first (returns path string directly)
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

    // Fall back to drawCompositionBorders with D3's path API
    const drawBorders = (projection as any)?.drawCompositionBorders
    if (typeof drawBorders !== 'function') {
      return null
    }

    // Use D3's path API to capture path commands
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

  /**
   * Apply overlays to rendered SVG map
   * Uses D3 selection for DOM manipulation
   */
  static applyOverlays(svg: SVGSVGElement, config: OverlayConfig): void {
    if (!config.showBorders && !config.showLimits) {
      return
    }

    // Use D3 to create overlay group
    const overlayGroup = select(svg)
      .append('g')
      .classed('map-overlays', true)
      .attr('pointer-events', 'none')

    // Render composition borders
    if (config.showBorders) {
      if (config.viewMode === 'composite-custom') {
        this.renderCustomCompositeBorders(overlayGroup, config)
      }
      else if (config.viewMode === 'built-in-composite') {
        this.renderExistingCompositeBorders(overlayGroup, config)
      }
    }

    // Render map limits
    // Map limits should always use the full scene bounds (viewport-based)
    // Composition borders only show individual territories, but map limits show the entire rendered content
    if (config.showLimits) {
      const sceneBounds = this.computeSceneBBox(config.width, config.height)
      if (sceneBounds && sceneBounds.width > 0 && sceneBounds.height > 0) {
        this.renderMapLimits(overlayGroup, sceneBounds)
      }
    }

    // Remove overlay group if empty
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
      // .attr('stroke-dasharray', '8 4')
      // .attr('stroke-linejoin', 'round')
      // .attr('opacity', 1)
  }

  /**
   * Render borders for custom composite projections
   * Uses D3 data join pattern for efficient rendering
   */
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

    // Filter borders to only include active territories (if filtering is enabled)
    if (config.filteredTerritoryCodes) {
      borders = borders.filter(border =>
        config.filteredTerritoryCodes!.has(border.territoryCode),
      )
    }

    // Filter out invalid borders
    const validBorders = borders
      .map(border => this.boundsToRect(border.bounds))
      .filter(rect => rect.width > 0 && rect.height > 0)

    // Use D3 data join pattern
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

  /**
   * Render borders for existing composite projections (from d3-composite-projections)
   */
  private static renderExistingCompositeBorders(
    overlayGroup: Selection<any, any, any, any>,
    config: OverlayConfig,
  ): void {
    const overlayProjectionId = config.projectionId
    if (!overlayProjectionId) {
      return
    }

    // Create the border path at the FULL width/height
    // Observable Plot creates projections at full size
    // The path coordinates will be in the full coordinate system
    const pathData = this.createCompositeBorderPath(
      overlayProjectionId,
      config.width,
      config.height,
    )

    if (!pathData) {
      return
    }

    // Use D3 selection with .call() for styling
    overlayGroup
      .append('path')
      .attr('d', pathData)
      .call(sel => this.compositionBorderStyle(sel))
  }

  /**
   * Render map limits (outer boundary rectangle)
   */
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
      // .style('stroke', 'currentColor')
      .attr('stroke', 'var(--color-neutral)')
      .style('fill', 'none')
      .style('stroke-width', 2)
      // .style('opacity', 0.7)
  }
}
