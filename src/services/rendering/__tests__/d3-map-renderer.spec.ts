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

  it('writes the title that titleOf gives from the code and the name of each territory', () => {
    const svg = D3MapRenderer.createSvgElement(800, 600)
    D3MapRenderer.renderTerritories(svg, collection, projection, { titleOf: (code, name) => `${code}: ${name}` })

    expect([...svg.querySelectorAll('g.territories path title')].map(title => title.textContent))
      .toEqual(['AA: Territory AA', 'BB: Territory BB'])
  })

  it('keeps the whole surface of a territory for the pointer without fill, and shows the hover on its outline', () => {
    const svg = D3MapRenderer.createSvgElement(800, 600)
    D3MapRenderer.renderTerritories(svg, collection, projection, { fillTerritories: false })
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
    D3MapRenderer.renderTerritories(svg, collection, projection)
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
    D3MapRenderer.renderTerritories(svg, collection, projection, { bordersOf: (codes) => {
      groups.push(codes)
      return mesh
    } })

    expect(groups).toEqual([['AA', 'BB']])
    expect(svg.querySelector('g.borders path')!.getAttribute('d')).toBe(geoPath(projection)(mesh))
  })
})

describe('drawing of the territories through each entry of a composite', () => {
  // The two frames overlap, and AA projected by the sub-projection of BB falls in the frame of BB
  const subProjectionA = geoMercator().scale(1000).center([2.5, 45.5]).translate([300, 300]).clipExtent([[200, 200], [450, 400]])
  const subProjectionB = geoMercator().scale(1000).center([2.5, 45.5]).translate([400, 300]).clipExtent([[350, 200], [600, 400]])
  const entries = [{ code: 'AA', projection: subProjectionA }, { code: 'BB', projection: subProjectionB }]

  function renderEntries(options = {}) {
    const svg = D3MapRenderer.createSvgElement(800, 600)
    D3MapRenderer.renderEntries(svg, collection, entries, options)
    return svg
  }

  it('draws one group per entry, in the order of the entries, with its territories then its borders', () => {
    const groups = [...renderEntries().querySelectorAll(':scope > g')]

    expect(groups.map(group => [group.getAttribute('class'), group.getAttribute('data-entry')])).toEqual([['entry', 'AA'], ['entry', 'BB']])
    for (const group of groups) {
      expect([...group.children].map(child => child.getAttribute('class'))).toEqual(['territories', 'borders'])
    }
  })

  it('draws each territory through the sub-projection of each entry whose frame it crosses, with the codes of the entry and of the territory', () => {
    const svg = renderEntries()

    for (const { code, projection: subProjection } of entries) {
      const drawn = collection.features.filter(feature => geoPath(subProjection)(feature))
      const paths = [...svg.querySelectorAll<SVGPathElement>(`g.entry[data-entry="${code}"] g.territories path`)]

      expect(paths.map(path => [path.getAttribute('data-entry'), path.getAttribute('data-territory'), path.getAttribute('d')]))
        .toEqual(drawn.map(feature => [code, feature.properties!.code, geoPath(subProjection)(feature)]))
    }
    // AA falls in both frames; BB, to the north east, in none
    expect([...svg.querySelectorAll('g.territories path')].map(path => `${path.getAttribute('data-entry')} ${path.getAttribute('data-territory')}`))
      .toEqual(['AA AA', 'BB AA'])
  })

  it('draws the borders of each entry through its sub-projection', () => {
    const groups: Array<readonly string[]> = []
    const mesh: GeoJSON.MultiLineString = { type: 'MultiLineString', coordinates: [[[2, 45], [3, 46]]] }
    const svg = renderEntries({ bordersOf: (codes: readonly string[]) => {
      groups.push(codes)
      return mesh
    } })

    expect(groups).toEqual([['AA'], ['AA']])
    expect(entries.map(({ code }) => svg.querySelector(`g.entry[data-entry="${code}"] g.borders path`)!.getAttribute('d')))
      .toEqual(entries.map(({ projection: subProjection }) => geoPath(subProjection)(mesh)))
  })

  it('draws the fills of an entry under the borders of the next entry', () => {
    const svg = renderEntries()
    const order = [...svg.querySelectorAll('g.territories path, g.borders path')]
      .map(path => `${path.closest('g.entry')!.getAttribute('data-entry')} ${path.parentElement!.getAttribute('class')}`)

    expect(order).toEqual(['AA territories', 'AA borders', 'BB territories', 'BB borders'])
  })
})
