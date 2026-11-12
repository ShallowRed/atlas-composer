import type { ProjectionLike } from '@atlas-composer/projection-core'
import type { GeoProjection } from 'd3-geo'
import type { TerritoryProjection } from '@/services/rendering/d3-map-renderer'
import { buildCompositeProjection } from '@atlas-composer/projection-core'
import { geoMercator, geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { boundsPolygon } from '@/__tests__/composite-utils'
import { D3MapRenderer } from '@/services/rendering/d3-map-renderer'

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

  it('draws no path for a territory without a sub-projection', () => {
    const paths = renderPaths(projectionOf, withoutProjection)

    expect(paths.map(element => element.getAttribute('data-territory'))).toEqual(['AA', 'BB'])
    expect(paths.map(element => element.querySelector('title')?.textContent)).toEqual(['Territory AA', 'Territory BB'])
  })
})
