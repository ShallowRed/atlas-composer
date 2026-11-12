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

/** The projection that draws a territory, or undefined when the territory has none */
export type TerritoryProjection = (feature: GeoJSON.Feature) => GeoProjection | undefined

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

    debug('Created standalone SVG: %dx%d', width, height)
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
    projectionOf: TerritoryProjection,
    options: TerritoryRenderOptions = {},
  ): void {
    const {
      enableTooltips = true,
      onHover,
      onClick,
    } = options

    const geoPaths = new Map<GeoProjection, GeoPath>()
    const pathOfFeature = new Map<GeoJSON.Feature, GeoPath>()
    for (const feature of geoData.features) {
      const projection = projectionOf(feature)
      if (projection) {
        const path = geoPaths.get(projection) ?? geoPath(projection)
        geoPaths.set(projection, path)
        pathOfFeature.set(feature, path)
      }
    }
    const svgSelection = select(svg)

    const territoriesGroup = svgSelection
      .append('g')
      .attr('class', 'territories')

    const paths = territoriesGroup
      .selectAll<SVGPathElement, GeoJSON.Feature>('path')
      .data([...pathOfFeature.keys()])
      .join('path')
      .attr('d', d => pathOfFeature.get(d)?.(d) || '')
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

    debug('Rendered %d of %d territories', pathOfFeature.size, geoData.features.length)
  }
}
