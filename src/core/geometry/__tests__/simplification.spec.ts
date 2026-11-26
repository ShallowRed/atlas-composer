import type { GeometryCollection, Objects, Topology } from 'topojson-specification'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { geoArea, geoMercator } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import { topology } from 'topojson-server'
import { presimplify, sphericalTriangleArea } from 'topojson-simplify'
import { describe, expect, it } from 'vitest'
import { minWeightAt, simplifyTopology, withoutAntimeridianSeams } from '@/core/geometry'

// A zigzag of n teeth of the given height, in degrees, from [x0, y] to [x0 + n, y]
function zigzag(x0: number, y: number, n: number, height: number): Array<[number, number]> {
  return Array.from({ length: 2 * n + 1 }, (_, index) => [x0 + index / 2, y + (index % 2) * height] as [number, number])
}

// Two squares with a zigzag shared border, rings clockwise as d3-geo reads them
function twoTerritories(): Topology<Objects> {
  const border = zigzag(0, 0, 4, 0.05).reverse()
  const north = [[0, 0], [0, 4], [4, 4], [4, 0], ...border]
  const south = [...[...border].reverse(), [4, 0], [4, -4], [0, -4], [0, 0]]
  const territory = (code: string, ring: number[][]) => ({ type: 'Feature' as const, properties: { code }, geometry: { type: 'Polygon' as const, coordinates: [ring] } })
  return presimplify(topology({ territories: { type: 'FeatureCollection', features: [territory('N', north), territory('S', south)] } } as never) as Topology<Objects>, sphericalTriangleArea)
}

function featureOf(simplified: Topology, code: string) {
  const collection = feature(simplified, simplified.objects.territories as GeometryCollection<{ code: string }>)
  return collection.features.find(candidate => candidate.properties.code === code)!
}

describe('minWeightAt', () => {
  it('gives a weight four times smaller when the scale of the projection doubles', () => {
    const weight = minWeightAt(geoMercator().scale(1000), [2, 46])
    const doubled = minWeightAt(geoMercator().scale(2000), [2, 46])

    expect(weight).toBeGreaterThan(0)
    expect(doubled * 4).toBeCloseTo(weight, 15)
  })

  it('gives 0, which keeps every point, when the projection draws no point', () => {
    const projection = Object.assign(() => null, geoMercator()) as unknown as Parameters<typeof minWeightAt>[0]
    expect(minWeightAt(projection, [2, 46])).toBe(0)
  })
})

describe('simplifyTopology', () => {
  const presimplified = twoTerritories()
  // Above the weight of a tooth, 4e-6 steradian, below that of a corner of a square, 2e-3 steradian
  const coarse = 1e-4
  const coordinates = (simplified: Topology, code: string) => JSON.stringify(featureOf(simplified, code).geometry)

  it('keeps a shared border at the smaller weight of its two territories, the same in both', () => {
    const simplified = simplifyTopology(presimplified, 'territories', geometry => (geometry.properties as { code: string }).code === 'N' ? 0 : coarse)
    const north = featureOf(simplified, 'N').geometry as GeoJSON.Polygon
    const south = featureOf(simplified, 'S').geometry as GeoJSON.Polygon
    const teeth = (ring: GeoJSON.Position[]) => ring.filter(([, y]) => y === 0.05).length

    expect(teeth(north.coordinates[0]!)).toBe(4)
    expect(teeth(south.coordinates[0]!)).toBe(4)
  })

  it('removes the teeth of a border whose territories both take a large weight, and keeps the ends of each arc', () => {
    const simplified = simplifyTopology(presimplified, 'territories', () => coarse)

    expect(coordinates(simplified, 'N')).not.toContain('0.05')
    expect((featureOf(simplified, 'N').geometry as GeoJSON.Polygon).coordinates[0]).toContainEqual([0, 0])
  })

  it('ignores the weight of a territory that minWeightOf leaves out', () => {
    const simplified = simplifyTopology(presimplified, 'territories', geometry => (geometry.properties as { code: string }).code === 'N' ? coarse : undefined)

    expect(coordinates(simplified, 'N')).not.toContain('0.05')
  })

  it('keeps Antarctica round the south pole, along which world-atlas runs its ring at the latitude -89.999', () => {
    const world = JSON.parse(readFileSync(createRequire(import.meta.url).resolve('world-atlas/countries-50m.json'), 'utf8')) as Topology
    const antarctica = feature(world, (world.objects.countries as GeometryCollection).geometries.find(country => country.id === '010')!)
    const presimplifiedAntarctica = presimplify(topology({ territories: { type: 'FeatureCollection', features: [
      { ...antarctica, properties: { code: 'AQ' } },
    ] } } as never) as Topology<Objects>, sphericalTriangleArea)

    const territory = featureOf(simplifyTopology(presimplifiedAntarctica, 'territories', () => coarse), 'AQ')

    expect(geoArea(territory)).toBeCloseTo(geoArea(antarctica), 2)
  })

  it('leaves no ring of less than four positions, and no territory larger than half the sphere', () => {
    const islet = [[10, 10], [10, 10.001], [10.001, 10.001], [10.001, 10], [10, 10]]
    const withIslet = presimplify(topology({ territories: { type: 'FeatureCollection', features: [
      { type: 'Feature', properties: { code: 'I' }, geometry: { type: 'MultiPolygon', coordinates: [[islet], [[[20, 20], [20, 22], [22, 22], [22, 20], [20, 20]]]] } },
    ] } } as never) as Topology<Objects>, sphericalTriangleArea)

    const territory = featureOf(simplifyTopology(withIslet, 'territories', () => coarse), 'I')
    const polygons = (territory.geometry as GeoJSON.MultiPolygon).coordinates

    expect(polygons.flat().every(ring => ring.length >= 4)).toBe(true)
    expect(polygons).toHaveLength(1)
    expect(geoArea(territory)).toBeLessThan(2 * Math.PI)
  })
})

describe('withoutAntimeridianSeams', () => {
  const lines = (...coordinates: GeoJSON.Position[][]): GeoJSON.MultiLineString => ({ type: 'MultiLineString', coordinates })
  // Segments whose two ends are on the antimeridian, at 180 or -180
  const seams = ({ coordinates }: GeoJSON.MultiLineString) => coordinates.flatMap(line => line.slice(1)
    .filter((point, index) => Math.abs(point[0]!) >= 179.99 && Math.abs(line[index]![0]!) >= 179.99))
  const segmentCount = ({ coordinates }: GeoJSON.MultiLineString) => coordinates.reduce((count, line) => count + line.length - 1, 0)

  it('splits a line at a segment along the antimeridian and keeps the other segments in their order', () => {
    expect(withoutAntimeridianSeams(lines([[170, 0], [180, 0], [180, 5], [170, 5]], [[-180, 0], [-180, 1]])))
      .toEqual(lines([[170, 0], [180, 0]], [[180, 5], [170, 5]]))
  })

  it('leaves out a segment from 180 to -180, along the antimeridian, and keeps the lines away from it', () => {
    expect(withoutAntimeridianSeams(lines([[179, 0], [180, 0], [-180, 1], [-179, 1]], [[0, 0], [1, 1]])))
      .toEqual(lines([[179, 0], [180, 0]], [[-180, 1], [-179, 1]], [[0, 0], [1, 1]]))
  })

  it('leaves out the cut of Fiji in the mesh of Natural Earth 50m and keeps the mesh of Russia', () => {
    const world = JSON.parse(readFileSync(createRequire(import.meta.url).resolve('world-atlas/countries-50m.json'), 'utf8')) as Topology<Objects>
    const countries = world.objects.countries as GeometryCollection
    const meshOf = (id: string) => mesh(world, { type: 'GeometryCollection', geometries: countries.geometries.filter(geometry => geometry.id === id) })
    const fiji = meshOf('242')
    const russia = meshOf('643')

    expect(seams(fiji)).toHaveLength(6)
    expect(seams(withoutAntimeridianSeams(fiji))).toHaveLength(0)
    expect(segmentCount(withoutAntimeridianSeams(fiji))).toBe(segmentCount(fiji) - 6)
    expect(withoutAntimeridianSeams(russia)).toEqual(russia)
  })
})
