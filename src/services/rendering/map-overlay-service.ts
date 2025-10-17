import type { CompositeProjection } from '@/services/projection/composite-projection'
import { select } from 'd3'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'

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
  viewMode: 'composite-custom' | 'composite-existing' | 'individual'
  projectionId?: string
  width: number
  height: number
  customComposite?: CompositeProjection | null
  inset: number
  isMainland?: boolean
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
   * Compute union of two rectangles
   * Uses D3-style null handling for progressive accumulation
   */
  static unionRect(base: Rect | null, next: Rect | null): Rect | null {
    if (!next)
      return base
    if (!base)
      return { ...next }

    const minX = Math.min(base.x, next.x)
    const minY = Math.min(base.y, next.y)
    const maxX = Math.max(base.x + base.width, next.x + next.width)
    const maxY = Math.max(base.y + base.height, next.y + next.height)

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  /**
   * Compute bounding box based on SVG viewport and insets
   * Observable Plot applies insets to the rendering, so we account for those
   */
  static computeSceneBBox(width: number, height: number, inset: number = 20): Rect | null {
    // Use the provided dimensions with inset
    // This matches how Observable Plot renders content within the SVG viewport
    const bounds = {
      x: inset,
      y: inset,
      width: width - 2 * inset,
      height: height - 2 * inset,
    }

    // Validate bounds
    if (bounds.width > 0 && bounds.height > 0) {
      return bounds
    }

    return null
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
        console.error('[MapOverlayService] Error getting composition borders:', err)
      }
    }

    // Fall back to drawCompositionBorders with custom context recorder
    const drawBorders = (projection as any)?.drawCompositionBorders
    if (typeof drawBorders !== 'function') {
      return null
    }

    // Use custom path recorder context to capture path commands
    const context = this.createPathRecorder()

    try {
      drawBorders.call(projection, context)
      const pathString = context.toString()
      return pathString.length > 0 ? pathString : null
    }
    catch (err) {
      console.error('[MapOverlayService] Error drawing composition borders:', err)
      return null
    }
  }

  /**
   * Create a path recorder context compatible with d3-geo path
   * Records path commands as SVG path data string
   */
  private static createPathRecorder() {
    const commands: string[] = []
    const format = (value: number) => {
      if (!Number.isFinite(value))
        return '0'
      return Math.abs(value) < 1e-6 ? '0' : value.toFixed(6).replace(/\.?0+$/, '')
    }

    return {
      moveTo(x: number, y: number) {
        commands.push(`M${format(x)},${format(y)}`)
      },
      lineTo(x: number, y: number) {
        commands.push(`L${format(x)},${format(y)}`)
      },
      rect(x: number, y: number, width: number, height: number) {
        commands.push(
          `M${format(x)},${format(y)}`,
          `L${format(x + width)},${format(y)}`,
          `L${format(x + width)},${format(y + height)}`,
          `L${format(x)},${format(y + height)}`,
          'Z',
        )
      },
      closePath() {
        commands.push('Z')
      },
      beginPath() {
        // No-op for compatibility with canvas-like contexts
      },
      toString() {
        return commands.join('')
      },
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
      .attr('class', 'map-overlays')
      .attr('pointer-events', 'none')

    // Use inset from config (calculated by InsetCalculator in coordinator)
    const fallbackSceneBounds = config.showLimits ? this.computeSceneBBox(config.width, config.height, config.inset) : null
    let mapBounds: Rect | null = null

    // Render composition borders
    if (config.showBorders) {
      if (config.viewMode === 'composite-custom') {
        mapBounds = this.renderCustomCompositeBorders(overlayGroup, config)
      }
      else if (config.viewMode === 'composite-existing') {
        mapBounds = this.renderExistingCompositeBorders(overlayGroup, config)
      }
    }

    // Render map limits
    if (config.showLimits) {
      const bounds = mapBounds || fallbackSceneBounds
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        this.appendRectOverlay(overlayGroup, bounds, 'map-limits', '4 3', 1.5)
      }
    }

    // Remove overlay group if empty
    if (overlayGroup.node()?.childNodes.length === 0) {
      overlayGroup.remove()
    }
  }

  /**
   * Render borders for custom composite projections
   */
  private static renderCustomCompositeBorders(
    overlayGroup: any,
    config: OverlayConfig,
  ): Rect | null {
    const composite = config.customComposite
    if (!composite) {
      return null
    }

    composite.build(config.width, config.height, true)
    const borders = composite.getCompositionBorders(config.width, config.height)

    let mapBounds: Rect | null = null

    borders.forEach((border) => {
      const rect = this.boundsToRect(border.bounds)
      if (rect.width === 0 || rect.height === 0) {
        return
      }

      this.appendRectOverlay(overlayGroup, rect, 'composition-border', '8 4', 1.25)
      mapBounds = this.unionRect(mapBounds, rect)
    })

    return mapBounds
  }

  /**
   * Render borders for existing composite projections (from d3-composite-projections)
   */
  private static renderExistingCompositeBorders(
    overlayGroup: any,
    config: OverlayConfig,
  ): Rect | null {
    const overlayProjectionId = config.projectionId
    if (!overlayProjectionId) {
      return null
    }

    // Create the border path at the FULL width/height
    // Observable Plot creates projections at full size and applies inset internally
    // The path coordinates will be in the full coordinate system
    const pathData = this.createCompositeBorderPath(
      overlayProjectionId,
      config.width,
      config.height,
    )

    if (!pathData) {
      return null
    }

    // Append path without any transform
    // The path coordinates are already in the full SVG coordinate system
    const pathEl = overlayGroup
      .append('path')
      .attr('d', pathData)
      .attr('class', 'composition-border')
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', '1.25')
      .attr('stroke-dasharray', '8 4')
      .attr('stroke-linejoin', 'round')
      .attr('opacity', '0.5')

    // Try to get bbox for map limits calculation
    // getBBox() returns coordinates in the element's coordinate system
    // Since we're not applying any transform, these are directly usable
    try {
      const bbox = (pathEl.node() as SVGPathElement).getBBox()
      if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
        return {
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
        }
      }
    }
    catch {
      // getBBox can fail in some circumstances, ignore errors
    }

    return null
  }

  /**
   * Append rectangle overlay using D3 selection
   */
  private static appendRectOverlay(
    group: any,
    rect: Rect,
    className: string,
    dash: string,
    strokeWidth: number,
  ): void {
    group
      .append('rect')
      .attr('x', rect.x.toFixed(2))
      .attr('y', rect.y.toFixed(2))
      .attr('width', rect.width.toFixed(2))
      .attr('height', rect.height.toFixed(2))
      .attr('class', className)
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', strokeWidth.toString())
      .attr('stroke-dasharray', dash)
      .attr('stroke-linejoin', 'round')
      .attr('opacity', '0.5')
  }
}
