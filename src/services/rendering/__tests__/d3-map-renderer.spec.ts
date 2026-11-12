import { geoMercator, geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { D3MapRenderer } from '@/services/rendering/d3-map-renderer'

function territory(code: string, [lon, lat]: [number, number]): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: 'Feature',
    properties: { code, name: `Territory ${code}` },
    geometry: {
      type: 'Polygon',
      coordinates: [[[lon, lat], [lon, lat + 1], [lon + 1, lat + 1], [lon + 1, lat], [lon, lat]]],
    },
  }
}

const collection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [territory('AA', [2, 45]), territory('BB', [10, 50])],
}

const projection = geoMercator().scale(1000).translate([400, 300])

function renderPaths() {
  const svg = D3MapRenderer.createSvgElement(800, 600)
  D3MapRenderer.renderTerritories(svg, collection, projection)
  return [...svg.querySelectorAll<SVGPathElement>('g.territories path')]
}

describe('drawing of the territories through one projection', () => {
  it('draws each territory with the path of the projection', () => {
    const path = geoPath(projection)

    expect(renderPaths().map(element => element.getAttribute('d')))
      .toEqual(collection.features.map(feature => path(feature)))
  })

  it('writes the code and the title of each territory', () => {
    const paths = renderPaths()

    expect(paths.map(element => element.getAttribute('data-territory'))).toEqual(['AA', 'BB'])
    expect(paths.map(element => element.querySelector('title')?.textContent)).toEqual(['Territory AA', 'Territory BB'])
  })
})
