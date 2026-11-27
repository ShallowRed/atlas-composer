import type { Selection } from 'd3'
import type { GeoPath, GeoPermissibleObjects, GeoProjection } from 'd3-geo'
import { select } from 'd3'
import { geoPath } from 'd3-geo'
import { getTerritoryFillColor, getTerritoryStrokeColor } from '@/utils/color-utils'
import { logger } from '@/utils/logger'

const debug = logger.render.cartographer

export type TerritoryTitle = (code: string, name: string) => string

export const TERRITORY_STROKE_WIDTH = 1
const HOVERED_STROKE_WIDTH = 2.5

/** The lines of the borders of a group of territories, each border once */
export type TerritoryBorders = (codes: readonly string[]) => GeoJSON.MultiLineString

export interface TerritoryRenderOptions {
  enableTooltips?: boolean
  // Without it, the borders of a group are the outlines of its territories
  bordersOf?: TerritoryBorders
  // Without fill, over a basemap, a territory keeps its whole surface for the pointer and shows the hover on its outline
  fillTerritories?: boolean
  titleOf?: TerritoryTitle
  onHover?: (feature: GeoJSON.Feature | null, event: MouseEvent) => void
  onClick?: (feature: GeoJSON.Feature, event: MouseEvent) => void
}

/** An entry of a composite: its code, and the sub-projection that draws the territories through its frame */
export interface EntryDrawing {
  code: string
  projection: GeoProjection
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
    projection: GeoProjection,
    options: TerritoryRenderOptions = {},
  ): void {
    const path = geoPath(projection)
    this.drawTerritories(select(svg), geoData.features.map(feature => ({ feature, d: path(feature) || '' })), path, options)
    debug('Rendered %d territories', geoData.features.length)
  }

  // One group per entry, in the order of the entries: each entry draws every territory through its sub-projection, which clips it
  // to its frame, and an entry drawn later covers the fills and borders of the previous ones
  static renderEntries(
    svg: SVGSVGElement,
    geoData: GeoJSON.FeatureCollection,
    entries: readonly EntryDrawing[],
    options: TerritoryRenderOptions = {},
  ): void {
    for (const { code, projection } of entries) {
      const path = geoPath(projection)
      const drawn = geoData.features.flatMap((feature) => {
        const d = path(feature)
        return d ? [{ feature, d }] : []
      })
      const group = select(svg).append('g').attr('class', 'entry').attr('data-entry', code)
      this.drawTerritories(group, drawn, path, options, code)
    }
    debug('Rendered %d territories through %d entries', geoData.features.length, entries.length)
  }

  private static drawTerritories<Parent extends SVGElement>(
    parent: Selection<Parent, unknown, null, undefined>,
    drawn: { feature: GeoJSON.Feature, d: string }[],
    path: GeoPath,
    options: TerritoryRenderOptions,
    entry?: string,
  ): void {
    const {
      enableTooltips = true,
      fillTerritories = true,
      titleOf = (_code: string, name: string) => name,
      bordersOf,
      onHover,
      onClick,
    } = options
    const features = drawn.map(({ feature }) => feature)
    const pathOf = new Map(drawn.map(({ feature, d }) => [feature, d]))

    const paths = parent
      .append('g')
      .attr('class', 'territories')
      .selectAll<SVGPathElement, GeoJSON.Feature>('path')
      .data(features)
      .join('path')
      .attr('d', d => pathOf.get(d)!)
      .attr('fill', fillTerritories ? getTerritoryFillColor() : 'transparent')
      .attr('pointer-events', fillTerritories ? null : 'all')
      .attr('stroke', getTerritoryStrokeColor())
      .attr('stroke-width', 0)
      .attr('data-territory', d => d.properties?.code || d.properties?.INSEE_DEP || '')
      .attr('data-entry', entry ?? null)

    // The borders of the territories, drawn once over them
    parent
      .append('g')
      .attr('class', 'borders')
      .attr('pointer-events', 'none')
      .selectAll('path')
      .data(features.length > 0 ? [features] : [])
      .join('path')
      .attr('d', group => path(bordersOf
        ? bordersOf(group.map(feature => feature.properties?.code))
        : { type: 'GeometryCollection', geometries: group.map(feature => feature.geometry) }) || '')
      .attr('fill', 'none')
      .attr('stroke', getTerritoryStrokeColor())
      .attr('stroke-width', TERRITORY_STROKE_WIDTH)

    if (enableTooltips) {
      paths.append('title')
        .text((d) => {
          const code = d.properties?.code ?? ''
          return titleOf(code, d.properties?.name || code)
        })
    }

    paths
      .on('mouseenter', (event: MouseEvent, d: GeoJSON.Feature) => {
        select(event.currentTarget as SVGPathElement).attr(fillTerritories ? 'opacity' : 'stroke-width', fillTerritories ? 0.8 : HOVERED_STROKE_WIDTH)
        if (onHover) {
          onHover(d, event)
        }
      })
      .on('mouseleave', (event: MouseEvent) => {
        select(event.currentTarget as SVGPathElement).attr(fillTerritories ? 'opacity' : 'stroke-width', fillTerritories ? 1 : 0)
        if (onHover) {
          onHover(null, event)
        }
      })

    if (onClick) {
      paths.on('click', (event: MouseEvent, d: GeoJSON.Feature) => {
        onClick(d, event)
      })
    }
  }
}
