import type { GeometryCollection, Topology } from 'topojson-specification'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { feature } from 'topojson-client'
import { describe, expect, it } from 'vitest'
import { longitudeDifference, longitudeExtent } from '#scripts/utils/longitudes'

const world = JSON.parse(readFileSync(createRequire(import.meta.url).resolve('world-atlas/countries-50m.json'), 'utf8')) as Topology
function ringsOf(id: string) {
  const country = feature(world, (world.objects.countries as GeometryCollection).geometries.find(geometry => geometry.id === id)!) as GeoJSON.Feature<GeoJSON.MultiPolygon>
  return country.geometry.coordinates.map(polygon => polygon[0]!.map(([lon]) => lon!))
}
function largest(rings: number[][]) {
  return rings.reduce((a, b) => (b.length > a.length ? b : a))
}

describe('longitudeExtent', () => {
  it('reads a ring away from the antimeridian from its smallest and largest longitudes', () => {
    expect(longitudeExtent([2, 8, 5, -4])).toEqual({ west: -4, east: 8, width: 12, center: 2 })
  })

  it('reads the polygon 15 of Fiji, whose ring goes from -180 to 180, as a thin strip on the antimeridian', () => {
    const { west, east, width } = longitudeExtent(ringsOf('242')[15]!)

    expect(west).toBeCloseTo(179.986, 3)
    expect(east).toBeCloseTo(-179.899, 3)
    expect(width).toBeCloseTo(0.115, 3)
  })

  it('reads the mainland of Russia across the antimeridian, with its west edge beyond its east edge', () => {
    const { west, east, width, center } = longitudeExtent(largest(ringsOf('643')))

    expect(west).toBeGreaterThan(east)
    expect(width).toBeLessThan(180)
    expect(center).toBeGreaterThan(90)
  })

  it('keeps the plain extent of Antarctica, whose ring goes round the south pole', () => {
    const { west, east } = longitudeExtent(largest(ringsOf('010')))

    expect(west).toBe(-180)
    expect(east).toBeCloseTo(178.59, 2)
  })
})

describe('longitudeDifference', () => {
  it('gives the shorter difference between two longitudes, across the antimeridian when it is shorter', () => {
    expect(longitudeDifference(179, -179)).toBe(-2)
    expect(longitudeDifference(-179, 179)).toBe(2)
    expect(longitudeDifference(10, 4)).toBe(6)
  })
})
