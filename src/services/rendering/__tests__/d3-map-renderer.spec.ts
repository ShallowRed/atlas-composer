import type { ProjectionLike } from '@atlas-composer/projection-core'
import type { GeoProjection } from 'd3-geo'
import type { TerritoryProjection } from '@/services/rendering/d3-map-renderer'
import { buildCompositeProjection } from '@atlas-composer/projection-core'
import { geoMercator, geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { boundsPolygon } from '@/__tests__/composite-utils'
import { D3MapRenderer, TERRITORY_STROKE_WIDTH } from '@/services/rendering/d3-map-renderer'

function territory(code: string, [lon, lat]: [number, number]): GeoJSON.Feature<GeoJSON.Polygon> {
  return boundsPolygon([[lon, lat], [lon + 1, lat + 1]], { code, name: `Territory ${code}` })
}

const collection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [territory('AA', [2, 45]), territory('BB', [10, 50])],
}

const projection = geoMercator().scale(1000).translate([400, 300])

function renderPaths(projectionOf: TerritoryProjection, data = collection) {
  const svg = D3MapRenderer.createSvgElement(800, 600)
  D3MapRenderer.renderTerritories(svg, data, projectionOf)
  return [...svg.querySelectorAll<SVGPathElement>('g.territories path')]
}

describe('drawing of the territories through one projection', () => {
  it('draws each territory with the path of the projection', () => {
    const path = geoPath(projection)

    expect(renderPaths(() => projection).map(element => element.getAttribute('d')))
      .toEqual(collection.features.map(feature => path(feature)))
  })

  it('writes the code and the title of each territory', () => {
    const paths = renderPaths(() => projection)

    expect(paths.map(element => element.getAttribute('data-territory'))).toEqual(['AA', 'BB'])
    expect(paths.map(element => element.querySelector('title')?.textContent)).toEqual(['Territory AA', 'Territory BB'])
  })

  it('writes the title that titleOf gives from the code and the name of each territory', () => {
    const svg = D3MapRenderer.createSvgElement(800, 600)
    D3MapRenderer.renderTerritories(svg, collection, () => projection, { titleOf: (code, name) => `${code}: ${name}` })

    expect([...svg.querySelectorAll('g.territories path title')].map(title => title.textContent))
      .toEqual(['AA: Territory AA', 'BB: Territory BB'])
  })

  it('keeps the whole surface of a territory for the pointer without fill, and shows the hover on its outline', () => {
    const svg = D3MapRenderer.createSvgElement(800, 600)
    D3MapRenderer.renderTerritories(svg, collection, () => projection, { fillTerritories: false })
    const [path] = svg.querySelectorAll<SVGPathElement>('g.territories path')

    expect(path!.getAttribute('fill')).toBe('transparent')
    expect(path!.getAttribute('pointer-events')).toBe('all')
    path!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(Number(path!.getAttribute('stroke-width'))).toBeGreaterThan(TERRITORY_STROKE_WIDTH)
    path!.dispatchEvent(new MouseEvent('mouseleave'))
    expect(Number(path!.getAttribute('stroke-width'))).toBe(0)
  })

  it('draws the territories without outline, and their borders once in a group that the pointer ignores', () => {
    const svg = D3MapRenderer.createSvgElement(800, 600)
    D3MapRenderer.renderTerritories(svg, collection, () => projection)
    const borders = [...svg.querySelectorAll<SVGPathElement>('g.borders path')]

    expect([...svg.querySelectorAll('g.territories path')].map(element => element.getAttribute('stroke-width'))).toEqual(['0', '0'])
    expect(svg.querySelector('g.borders')!.getAttribute('pointer-events')).toBe('none')
    expect(borders).toHaveLength(1)
    expect(borders[0]!.hasAttribute('data-territory')).toBe(false)
    expect(Number(borders[0]!.getAttribute('stroke-width'))).toBe(TERRITORY_STROKE_WIDTH)
    expect(borders[0]!.getAttribute('d')).toBe(geoPath(projection)({ type: 'GeometryCollection', geometries: collection.features.map(feature => feature.geometry) }))
  })

  it('draws the borders that bordersOf gives for the codes of the group', () => {
    const mesh: GeoJSON.MultiLineString = { type: 'MultiLineString', coordinates: [[[2, 45], [3, 46]]] }
    const groups: Array<readonly string[]> = []
    const svg = D3MapRenderer.createSvgElement(800, 600)
    D3MapRenderer.renderTerritories(svg, collection, () => projection, { bordersOf: (codes) => {
      groups.push(codes)
      return mesh
    } })

    expect(groups).toEqual([['AA', 'BB']])
    expect(svg.querySelector('g.borders path')!.getAttribute('d')).toBe(geoPath(projection)(mesh))
  })
})

describe('drawing of the territories through the sub-projection of their code', () => {
  // The two frames overlap, and AA projected by the sub-projection of BB falls in the frame of BB
  const subProjectionA = geoMercator().scale(1000).center([2.5, 45.5]).translate([300, 300]).clipExtent([[200, 200], [450, 400]])
  const subProjectionB = geoMercator().scale(1000).center([2.5, 45.5]).translate([400, 300]).clipExtent([[350, 200], [600, 400]])
  const subProjections = new Map<string, GeoProjection>([['AA', subProjectionA], ['BB', subProjectionB]])
  const projectionOf: TerritoryProjection = feature => subProjections.get(feature.properties?.code)

  const withoutProjection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [...collection.features, territory('CC', [20, 40])],
  }

  it('draws a territory with the path of the sub-projection of its code only', () => {
    const [pathA] = renderPaths(projectionOf)

    expect(pathA!.getAttribute('d')).toBe(geoPath(subProjectionA)(collection.features[0]!))
  })

  it('differs from the drawing of the composite, which draws the territory in each frame', () => {
    const composite = buildCompositeProjection({
      entries: [...subProjections].map(([id, subProjection]) => ({ id, name: id, projection: subProjection as unknown as ProjectionLike })),
    }) as unknown as GeoProjection
    const [pathA] = renderPaths(() => composite)
    const ownPath = geoPath(subProjectionA)(collection.features[0]!)!

    expect(pathA!.getAttribute('d')).toContain(ownPath)
    expect(pathA!.getAttribute('d')).not.toBe(ownPath)
  })

  it('draws one border path per sub-projection', () => {
    const svg = D3MapRenderer.createSvgElement(800, 600)
    D3MapRenderer.renderTerritories(svg, withoutProjection, projectionOf)

    expect([...svg.querySelectorAll('g.borders path')].map(element => element.getAttribute('d')))
      .toEqual(collection.features.map((feature, index) => geoPath([subProjectionA, subProjectionB][index]!)({ type: 'GeometryCollection', geometries: [feature.geometry] }) ?? ''))
  })

  it('draws no path for a territory without a sub-projection', () => {
    const paths = renderPaths(projectionOf, withoutProjection)

    expect(paths.map(element => element.getAttribute('data-territory'))).toEqual(['AA', 'BB'])
    expect(paths.map(element => element.querySelector('title')?.textContent)).toEqual(['Territory AA', 'Territory BB'])
  })
})
