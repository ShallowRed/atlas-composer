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
 * Renders borders for custom composite projections
 */
export class CustomCompositeBorderRenderer implements BorderRenderer {
  private customComposite: any // CompositeProjection type

  constructor(customComposite: any) {
    this.customComposite = customComposite
  }

  render(group: SVGGElement, width: number, height: number): void {
    if (!this.customComposite) {
      return
    }

    this.customComposite.build(width, height, true)
    const borders = this.customComposite.getCompositionBorders(width, height)

    let mapBounds: Rect | null = null

    borders.forEach((border: any) => {
      const rect = this.boundsToRect(border.bounds)
      if (rect.width === 0 || rect.height === 0) {
        return
      }
      this.appendRectOverlay(group, rect, 'composition-border', '8 4', 1.25)
      mapBounds = this.unionRect(mapBounds, rect)
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

  private unionRect(base: Rect | null, next: Rect | null): Rect | null {
    if (!next) {
      return base
    }
    if (!base) {
      return { ...next }
    }
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

  private appendRectOverlay(
    group: SVGGElement,
    rect: Rect,
    className: string,
    dash: string,
    strokeWidth: number,
  ): SVGRectElement {
    const rectEl = document.createElementNS(group.namespaceURI, 'rect') as SVGRectElement
    rectEl.setAttribute('x', rect.x.toFixed(2))
    rectEl.setAttribute('y', rect.y.toFixed(2))
    rectEl.setAttribute('width', rect.width.toFixed(2))
    rectEl.setAttribute('height', rect.height.toFixed(2))
    rectEl.setAttribute('fill', 'none')
    rectEl.setAttribute('stroke', 'currentColor')
    rectEl.setAttribute('stroke-width', strokeWidth.toString())
    rectEl.setAttribute('stroke-dasharray', dash)
    rectEl.setAttribute('stroke-linejoin', 'round')
    rectEl.setAttribute('class', className)
    rectEl.setAttribute('opacity', '0.5')
    group.appendChild(rectEl)
    return rectEl
  }
}

/**
 * Renders borders for existing composite projections (d3-composite-projections)
 */
export class ExistingCompositeBorderRenderer implements BorderRenderer {
  private projectionId: string
  private projectionRegistry: any // ProjectionRegistry type

  constructor(
    projectionId: string,
    projectionRegistry: any,
  ) {
    this.projectionId = projectionId
    this.projectionRegistry = projectionRegistry
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
      const pathEl = this.appendPathOverlay(group, pathData, 'composition-border')
      pathEl.setAttribute('transform', `translate(${inset}, ${inset})`)
    }
  }

  private createCompositeBorderPath(
    projectionId: string,
    width: number,
    height: number,
  ): string | null {
    const definition = this.projectionRegistry.get(projectionId)
    if (!definition) {
      return null
    }

    const projection = this.createProjection(projectionId)
    if (!projection) {
      return null
    }

    // Apply scale and translation
    this.applyProjectionTransform(projection, definition, width, height)

    // Try getCompositionBorders first
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

    // Fall back to drawCompositionBorders with custom context
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

  private createProjection(_projectionId: string): any {
    // Import ProjectionFactory to create projection
    // This would need proper import in real implementation
    return null // Placeholder
  }

  private applyProjectionTransform(projection: any, definition: any, width: number, height: number): void {
    const customFit = definition.metadata?.customFit
    if (customFit) {
      const scaleFactor = width / customFit.referenceWidth
      projection.scale(customFit.defaultScale * scaleFactor)
      projection.translate([width / 2, height / 2])
    }
    else {
      const defaultScale = 1000
      const referenceWidth = 960
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

  private appendPathOverlay(
    group: SVGGElement,
    pathData: string,
    className: string,
  ): SVGPathElement {
    const pathEl = document.createElementNS(group.namespaceURI, 'path') as SVGPathElement
    pathEl.setAttribute('d', pathData)
    pathEl.setAttribute('fill', 'none')
    pathEl.setAttribute('stroke', 'currentColor')
    pathEl.setAttribute('stroke-width', '1.25')
    pathEl.setAttribute('stroke-dasharray', '8 4')
    pathEl.setAttribute('stroke-linejoin', 'round')
    pathEl.setAttribute('opacity', '0.5')
    pathEl.setAttribute('class', className)
    group.appendChild(pathEl)
    return pathEl
  }
}
