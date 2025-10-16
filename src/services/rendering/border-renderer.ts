import type { CompositeProjection } from '@/services/projection/composite-projection'
import { select } from 'd3'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'

/**
 * Interface for rendering composition borders
 * Different view modes have different border rendering strategies
 */
export interface BorderRenderer {
  render: (group: SVGGElement, width: number, height: number) => void
}

/**
 * Rectangle bounds for overlay rendering
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Renders borders for custom composite projections using D3 selection API
 */
export class CustomCompositeBorderRenderer implements BorderRenderer {
  private customComposite: CompositeProjection

  constructor(customComposite: CompositeProjection) {
    this.customComposite = customComposite
  }

  render(group: SVGGElement, width: number, height: number): void {
    if (!this.customComposite) {
      return
    }

    this.customComposite.build(width, height, true)
    const borders = this.customComposite.getCompositionBorders(width, height)

    // Use D3 selection API for cleaner DOM manipulation
    const selection = select(group)

    borders.forEach((border: any) => {
      const rect = this.boundsToRect(border.bounds)
      if (rect.width === 0 || rect.height === 0) {
        return
      }

      // Append rectangle using D3 selection
      selection
        .append('rect')
        .attr('x', rect.x.toFixed(2))
        .attr('y', rect.y.toFixed(2))
        .attr('width', rect.width.toFixed(2))
        .attr('height', rect.height.toFixed(2))
        .attr('class', 'composition-border')
        .attr('data-territory', border.territoryCode)
        .attr('fill', 'none')
        .attr('stroke', 'currentColor')
        .attr('stroke-width', '1.25')
        .attr('stroke-dasharray', '8 4')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', '0.5')
    })
  }

  private boundsToRect(bounds: [[number, number], [number, number]]): Rect {
    const [[x1, y1], [x2, y2]] = bounds
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    }
  }
}

/**
 * Renders borders for existing composite projections (d3-composite-projections) using D3
 */
export class ExistingCompositeBorderRenderer implements BorderRenderer {
  private projectionId: string
  private canvasDimensions?: { width: number, height: number }

  constructor(projectionId: string, canvasDimensions?: { width: number, height: number }) {
    this.projectionId = projectionId
    this.canvasDimensions = canvasDimensions
  }

  render(group: SVGGElement, width: number, height: number): void {
    // Plot applies a 20px inset for composite maps
    const inset = 20
    const adjustedWidth = width - 2 * inset
    const adjustedHeight = height - 2 * inset

    const pathData = this.createCompositeBorderPath(
      this.projectionId,
      adjustedWidth,
      adjustedHeight,
    )

    if (pathData) {
      // Use D3 selection API for cleaner path creation
      select(group)
        .append('path')
        .attr('d', pathData)
        .attr('class', 'composition-border')
        .attr('fill', 'none')
        .attr('stroke', 'currentColor')
        .attr('stroke-width', '1.25')
        .attr('stroke-dasharray', '8 4')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', '0.5')
        .attr('transform', `translate(${inset}, ${inset})`)
    }
  }

  private createCompositeBorderPath(
    projectionId: string,
    width: number,
    height: number,
  ): string | null {
    const definition = projectionRegistry.get(projectionId)
    if (!definition) {
      return null
    }

    const projection = ProjectionFactory.createById(projectionId)
    if (!projection) {
      return null
    }

    // Apply scale and translation
    this.applyProjectionTransform(projection, definition, width, height)

    // Try getCompositionBorders first (convenience method that returns path string)
    const getBorders = (projection as any)?.getCompositionBorders
    if (typeof getBorders === 'function') {
      try {
        const pathString = getBorders.call(projection)
        return pathString.length > 0 ? pathString : null
      }
      catch (err) {
        console.error('[BorderRenderer] Error getting composition borders:', err)
      }
    }

    // Fall back to drawCompositionBorders with custom path recorder context
    const drawBorders = (projection as any)?.drawCompositionBorders
    if (typeof drawBorders !== 'function') {
      return null
    }

    const context = this.createPathRecorder()
    try {
      drawBorders.call(projection, context)
      const pathString = context.toString()
      return pathString.length > 0 ? pathString : null
    }
    catch (err) {
      console.error('[BorderRenderer] Error drawing composition borders:', err)
      return null
    }
  }

  private applyProjectionTransform(projection: any, definition: any, width: number, height: number): void {
    const customFit = definition.metadata?.customFit
    if (customFit) {
      // Use preset canvas dimensions if available, otherwise fall back to customFit metadata
      const referenceWidth = this.canvasDimensions?.width ?? customFit.referenceWidth
      const scaleFactor = width / referenceWidth
      projection.scale(customFit.defaultScale * scaleFactor)
      projection.translate([width / 2, height / 2])
    }
    else {
      const defaultScale = 1000
      const referenceWidth = this.canvasDimensions?.width ?? 960
      if (typeof projection.scale === 'function') {
        const scaleFactor = width / referenceWidth
        projection.scale(defaultScale * scaleFactor)
      }
      if (typeof projection.translate === 'function') {
        projection.translate([width / 2, height / 2])
      }
    }
  }

  private createPathRecorder() {
    const commands: string[] = []
    const format = (value: number) => {
      if (!Number.isFinite(value)) {
        return '0'
      }
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
        // No-op for compatibility
      },
      toString() {
        return commands.join('')
      },
    }
  }
}
