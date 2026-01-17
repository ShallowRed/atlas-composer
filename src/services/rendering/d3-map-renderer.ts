import type { Selection } from 'd3'
import type { GeoPath, GeoPermissibleObjects, GeoProjection } from 'd3-geo'
import { select } from 'd3'
import { geoPath } from 'd3-geo'
import { getTerritoryFillColor, getTerritoryStrokeColor } from '@/utils/color-utils'
import { logger } from '@/utils/logger'

const debug = logger.render.cartographer

export interface TerritoryRenderOptions {
  enableTooltips?: boolean
  onHover?: (feature: GeoJSON.Feature | null, event: MouseEvent) => void
  onClick?: (feature: GeoJSON.Feature, event: MouseEvent) => void
}

export interface SphereRenderOptions {
  stroke?: string
  strokeWidth?: number
  fill?: string
}
export class D3MapRenderer {
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

  static createSvg(
    container: HTMLElement,
    width: number,
    height: number,
  ): SVGSVGElement {
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

  static renderTerritories(
    svg: SVGSVGElement,
    geoData: GeoJSON.FeatureCollection,
    projection: GeoProjection,
    options: TerritoryRenderOptions = {},
  ): GeoPath {
    const {
      enableTooltips = true,
      onHover,
      onClick,
    } = options

    const path = geoPath(projection)
    const svgSelection = select(svg)

    const territoriesGroup = svgSelection
      .append('g')
      .attr('class', 'territories')

    const paths = territoriesGroup
      .selectAll<SVGPathElement, GeoJSON.Feature>('path')
      .data(geoData.features)
      .join('path')
      .attr('d', d => path(d) || '')
      .attr('fill', getTerritoryFillColor())
      .attr('stroke', getTerritoryStrokeColor())
      .attr('stroke-width', 1)
      .attr('data-territory', d => d.properties?.code || d.properties?.INSEE_DEP || '')

    if (enableTooltips) {
      paths.append('title')
        .text(d => d.properties?.name || d.properties?.code || '')
    }

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

    if (onClick) {
      paths.on('click', (event: MouseEvent, d: GeoJSON.Feature) => {
        onClick(d, event)
      })
    }

    debug('Rendered %d territories', geoData.features.length)
    return path
  }

  static renderTerritoriesWithComposite(
    svg: SVGSVGElement,
    geoData: GeoJSON.FeatureCollection,
    compositeProjection: GeoProjection,
    options: TerritoryRenderOptions = {},
  ): GeoPath {
    return this.renderTerritories(svg, geoData, compositeProjection, options)
  }

  static addTerritoryAttributes(
    svg: SVGSVGElement,
    geoData: GeoJSON.FeatureCollection,
  ): void {
    const svgSelection = select(svg)
    const pathSelection = svgSelection.selectAll<SVGPathElement, unknown>('path')

    pathSelection.each(function (_d, i) {
      const pathElement = this as SVGPathElement

      const boundData = (pathElement as any).__data__ as GeoJSON.Feature | undefined

      if (boundData?.properties) {
        const territoryCode = boundData.properties.code || boundData.properties.INSEE_DEP
        if (territoryCode) {
          select(pathElement).attr('data-territory', territoryCode)
          return
        }
      }

      if (i < geoData.features.length) {
        const feature = geoData.features[i]
        const territoryCode = feature?.properties?.code || feature?.properties?.INSEE_DEP
        if (territoryCode) {
          select(pathElement).attr('data-territory', territoryCode)
        }
      }
    })
  }

  static getTerritoriesGroup(
    svg: SVGSVGElement,
  ): Selection<SVGGElement, unknown, null, undefined> | null {
    const group = select(svg).select<SVGGElement>('g.territories')
    return group.empty() ? null : group
  }

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

  static clearSvg(svg: SVGSVGElement): void {
    select(svg).selectAll('*').remove()
  }
}
