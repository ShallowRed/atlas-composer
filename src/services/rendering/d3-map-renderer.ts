import type { Selection } from 'd3'
import type { GeoPath, GeoPermissibleObjects, GeoProjection } from 'd3-geo'
import { select } from 'd3'
import { geoPath } from 'd3-geo'
import { getTerritoryFillColor, getTerritoryStrokeColor } from '@/utils/color-utils'
import { logger } from '@/utils/logger'

const debug = logger.render.cartographer

/**
 * Options for territory rendering
 */
export interface TerritoryRenderOptions {
  /** Mainland territory code for color differentiation */
  mainlandCode?: string
  /** Alternative mainland code from geoData config */
  geoDataMainlandCode?: string
  /** Whether to enable tooltips on hover */
  enableTooltips?: boolean
  /** Callback when territory is hovered */
  onHover?: (feature: GeoJSON.Feature | null, event: MouseEvent) => void
  /** Callback when territory is clicked */
  onClick?: (feature: GeoJSON.Feature, event: MouseEvent) => void
}

/**
 * Options for sphere rendering
 */
export interface SphereRenderOptions {
  /** Stroke color */
  stroke?: string
  /** Stroke width */
  strokeWidth?: number
  /** Fill color (usually transparent) */
  fill?: string
}

/**
 * D3MapRenderer - Pure D3 map rendering service
 *
 * Provides direct D3 rendering of geographic data, replacing Observable Plot.
 * Key benefit: Uses the same projection instance for map and overlays,
 * eliminating projection synchronization issues.
 *
 * Design: Stateless static methods, projection passed in from caller.
 */
export class D3MapRenderer {
  /**
   * Create a standalone SVG element with proper dimensions and viewBox
   *
   * Use this when you don't have a container yet (e.g., Cartographer service)
   * and will append the SVG to the DOM later.
   *
   * @param width - SVG width
   * @param height - SVG height
   * @returns The created SVG element
   */
  static createSvgElement(
    width: number,
    height: number,
  ): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svg.style.maxWidth = '100%'
    svg.style.height = 'auto'

    debug('Created standalone SVG: %dx%d', width, height)
    return svg
  }

  /**
   * Create an SVG element with proper dimensions and viewBox, appended to a container
   *
   * @param container - HTML element to append SVG to
   * @param width - SVG width
   * @param height - SVG height
   * @returns The created SVG element
   */
  static createSvg(
    container: HTMLElement,
    width: number,
    height: number,
  ): SVGSVGElement {
    // Clear existing content
    container.innerHTML = ''

    const svg = select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-width', '100%')
      .style('height', 'auto')
      .node()

    if (!svg) {
      throw new Error('Failed to create SVG element')
    }

    debug('Created SVG: %dx%d', width, height)
    return svg
  }

  /**
   * Render the sphere outline (earth boundary)
   *
   * Should be called before rendering territories to appear behind them.
   *
   * @param svg - SVG element to render into
   * @param projection - D3 geo projection
   * @param options - Sphere styling options
   */
  static renderSphere(
    svg: SVGSVGElement,
    projection: GeoProjection,
    options: SphereRenderOptions = {},
  ): void {
    const {
      stroke = 'currentColor',
      strokeWidth = 1.5,
      fill = 'none',
    } = options

    const path = geoPath(projection)
    const sphereData: GeoPermissibleObjects = { type: 'Sphere' }

    select(svg)
      .append('path')
      .datum(sphereData)
      .attr('class', 'sphere')
      .attr('d', path)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)

    debug('Rendered sphere outline')
  }

  /**
   * Render geographic territories (countries, regions, etc.)
   *
   * @param svg - SVG element to render into
   * @param geoData - GeoJSON FeatureCollection to render
   * @param projection - D3 geo projection
   * @param options - Territory rendering options
   * @returns The path generator used (for overlay consistency)
   */
  static renderTerritories(
    svg: SVGSVGElement,
    geoData: GeoJSON.FeatureCollection,
    projection: GeoProjection,
    options: TerritoryRenderOptions = {},
  ): GeoPath {
    const {
      mainlandCode,
      geoDataMainlandCode,
      enableTooltips = true,
      onHover,
      onClick,
    } = options

    const path = geoPath(projection)
    const svgSelection = select(svg)

    // Create a group for territories
    const territoriesGroup = svgSelection
      .append('g')
      .attr('class', 'territories')

    // Render each feature as a path
    const paths = territoriesGroup
      .selectAll<SVGPathElement, GeoJSON.Feature>('path')
      .data(geoData.features)
      .join('path')
      .attr('d', d => path(d) || '')
      .attr('fill', (d) => {
        const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
        return getTerritoryFillColor(code, mainlandCode, geoDataMainlandCode)
      })
      .attr('stroke', (d) => {
        const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
        return getTerritoryStrokeColor(code, mainlandCode, geoDataMainlandCode)
      })
      .attr('stroke-width', 1)
      .attr('data-territory', d => d.properties?.code || d.properties?.INSEE_DEP || '')

    // Add tooltips using title elements (native SVG tooltip)
    if (enableTooltips) {
      paths.append('title')
        .text(d => d.properties?.name || d.properties?.code || '')
    }

    // Add hover effects
    paths
      .on('mouseenter', (event: MouseEvent, d: GeoJSON.Feature) => {
        select(event.currentTarget as SVGPathElement).attr('opacity', 0.8)
        if (onHover) {
          onHover(d, event)
        }
      })
      .on('mouseleave', (event: MouseEvent) => {
        select(event.currentTarget as SVGPathElement).attr('opacity', 1)
        if (onHover) {
          onHover(null, event)
        }
      })

    // Add click handler
    if (onClick) {
      paths.on('click', (event: MouseEvent, d: GeoJSON.Feature) => {
        onClick(d, event)
      })
    }

    debug('Rendered %d territories', geoData.features.length)
    return path
  }

  /**
   * Render territories with a custom composite projection
   *
   * For composite-custom mode where each territory has its own sub-projection.
   * The composite projection handles routing coordinates to the correct sub-projection.
   *
   * @param svg - SVG element to render into
   * @param geoData - GeoJSON FeatureCollection to render
   * @param compositeProjection - Composite projection (implements stream interface)
   * @param options - Territory rendering options
   * @returns The path generator used
   */
  static renderTerritoriesWithComposite(
    svg: SVGSVGElement,
    geoData: GeoJSON.FeatureCollection,
    compositeProjection: GeoProjection,
    options: TerritoryRenderOptions = {},
  ): GeoPath {
    // Same implementation as renderTerritories - the composite projection
    // handles the complexity internally via its stream interface
    return this.renderTerritories(svg, geoData, compositeProjection, options)
  }

  /**
   * Add data-territory attributes to existing SVG paths
   *
   * Useful when working with SVG that was rendered elsewhere.
   *
   * @param svg - SVG element containing paths
   * @param geoData - GeoJSON data for territory code lookup
   */
  static addTerritoryAttributes(
    svg: SVGSVGElement,
    geoData: GeoJSON.FeatureCollection,
  ): void {
    const svgSelection = select(svg)
    const pathSelection = svgSelection.selectAll<SVGPathElement, unknown>('path')

    pathSelection.each(function (_d, i) {
      const pathElement = this as SVGPathElement

      // Check if D3 has bound data to this element
      const boundData = (pathElement as any).__data__ as GeoJSON.Feature | undefined

      if (boundData?.properties) {
        const territoryCode = boundData.properties.code || boundData.properties.INSEE_DEP
        if (territoryCode) {
          select(pathElement).attr('data-territory', territoryCode)
          return
        }
      }

      // Fallback: try to match by index
      if (i < geoData.features.length) {
        const feature = geoData.features[i]
        const territoryCode = feature?.properties?.code || feature?.properties?.INSEE_DEP
        if (territoryCode) {
          select(pathElement).attr('data-territory', territoryCode)
        }
      }
    })
  }

  /**
   * Get the territories group from an SVG
   *
   * @param svg - SVG element
   * @returns D3 selection of the territories group, or null if not found
   */
  static getTerritoriesGroup(
    svg: SVGSVGElement,
  ): Selection<SVGGElement, unknown, null, undefined> | null {
    const group = select(svg).select<SVGGElement>('g.territories')
    return group.empty() ? null : group
  }

  /**
   * Update territory styling (e.g., for highlighting)
   *
   * @param svg - SVG element
   * @param territoryCode - Territory code to update
   * @param styles - CSS styles to apply
   */
  static updateTerritoryStyle(
    svg: SVGSVGElement,
    territoryCode: string,
    styles: Record<string, string | null>,
  ): void {
    const path = select(svg).select(`path[data-territory="${territoryCode}"]`)
    if (!path.empty()) {
      for (const [key, value] of Object.entries(styles)) {
        if (value === null) {
          path.style(key, null)
        }
        else if (value !== undefined) {
          path.style(key, value)
        }
      }
    }
  }

  /**
   * Clear all content from SVG
   *
   * @param svg - SVG element to clear
   */
  static clearSvg(svg: SVGSVGElement): void {
    select(svg).selectAll('*').remove()
  }
}
