import type { GeoProjection } from 'd3-geo'
import type { RingWeighter } from 'topojson-simplify'
import type { GeometryCollection, GeometryObject, Objects, Topology } from 'topojson-specification'
import { geoArea } from 'd3-geo'
import { filter, filterWeight, sphericalRingArea } from 'topojson-simplify'

/** The area, in square CSS pixels, of the smallest triangle that the simplification keeps: one square pixel at a density of 2 */
const MIN_PIXEL_AREA = 0.25

// Half the side, in degrees, of the square whose projection gives the scale of a projection at a point
const PROBE = 0.01

// Natural Earth cuts the rings at the antimeridian, and runs the ring of Antarctica along the latitude -89.999 in
// world-atlas: the points of these lines draw triangles of almost no spherical area, and the ring needs them to go
// round the pole
const CUT_LINE_TOLERANCE = 0.01

function onAntimeridian(longitude: number): boolean {
  return Math.abs(longitude) >= 180 - CUT_LINE_TOLERANCE
}

function onCutLine([longitude, latitude]: number[]): boolean {
  return onAntimeridian(longitude!) || Math.abs(latitude!) >= 90 - CUT_LINE_TOLERANCE
}

/**
 * The lines without their segments along the antimeridian, where Natural Earth cuts a ring: a line is split where such a
 * segment was, and a line reduced to a point is left out. The mesh of the borders keeps these segments, since each belongs
 * to one territory, as a coastline does
 */
export function withoutAntimeridianSeams(lines: GeoJSON.MultiLineString): GeoJSON.MultiLineString {
  const seam = ([lonA]: GeoJSON.Position, [lonB]: GeoJSON.Position) =>
    onAntimeridian(lonA!) && onAntimeridian(lonB!) && Math.sign(lonA!) === Math.sign(lonB!)
  const coordinates = lines.coordinates.flatMap((line) => {
    const parts: GeoJSON.Position[][] = [[line[0]!]]
    for (let index = 1; index < line.length; index++) {
      if (seam(line[index - 1]!, line[index]!)) {
        parts.push([line[index]!])
      }
      else {
        parts.at(-1)!.push(line[index]!)
      }
    }
    return parts.filter(part => part.length > 1)
  })
  return { ...lines, coordinates }
}

/**
 * The smallest weight of presimplify(topology, sphericalTriangleArea), in steradians, of a triangle that the projection
 * draws at this point with an area of MIN_PIXEL_AREA, or 0, which keeps every point, when the projection draws no square there
 */
export function minWeightAt(projection: GeoProjection, [longitude, latitude]: [number, number]): number {
  // Clockwise in longitude and latitude, as d3-geo reads the exterior ring of a small polygon
  const corners: Array<[number, number]> = [
    [longitude - PROBE, latitude - PROBE],
    [longitude - PROBE, latitude + PROBE],
    [longitude + PROBE, latitude + PROBE],
    [longitude + PROBE, latitude - PROBE],
  ]
  const pixels = corners.map(corner => projection(corner))
  let doubleArea = 0
  for (let index = 0; index < pixels.length; index++) {
    const current = pixels[index]
    const next = pixels[(index + 1) % pixels.length]
    if (!current || !next) {
      return 0
    }
    doubleArea += current[0] * next[1] - next[0] * current[1]
  }
  const pixelArea = Math.abs(doubleArea) / 2
  const steradians = geoArea({ type: 'Polygon', coordinates: [[...corners, corners[0]!]] })
  return Number.isFinite(pixelArea) && pixelArea > 0 ? MIN_PIXEL_AREA * steradians / pixelArea : 0
}

function arcIndices(geometry: GeometryObject): number[] {
  switch (geometry.type) {
    case 'LineString':
      return geometry.arcs
    case 'MultiLineString':
    case 'Polygon':
      return geometry.arcs.flat()
    case 'MultiPolygon':
      return geometry.arcs.flat(2)
    case 'GeometryCollection':
      return geometry.geometries.flatMap(arcIndices)
    default:
      return []
  }
}

/**
 * Keeps in each arc of a presimplified topology the points whose weight reaches the smallest weight that minWeightOf
 * gives the geometries of the object that use this arc, so that a border shared by two territories stays the same in
 * both. simplify of topojson-simplify takes one weight for the whole topology. A geometry for which minWeightOf gives
 * undefined counts for no arc. The points on the antimeridian and on the poles stay. The rings reduced to two points,
 * which have no area, are then removed.
 */
export function simplifyTopology(
  presimplified: Topology<Objects>,
  objectName: string,
  minWeightOf: (geometry: GeometryObject) => number | undefined,
): Topology<Objects> {
  const arcWeights = new Map<number, number>()
  const object = presimplified.objects[objectName] as GeometryCollection
  for (const geometry of object.geometries) {
    const weight = minWeightOf(geometry)
    if (weight === undefined) {
      continue
    }
    for (const index of arcIndices(geometry)) {
      const arc = index < 0 ? ~index : index
      arcWeights.set(arc, Math.min(arcWeights.get(arc) ?? Infinity, weight))
    }
  }

  const simplified: Topology<Objects> = {
    type: 'Topology',
    ...(presimplified.bbox && { bbox: presimplified.bbox }),
    objects: presimplified.objects,
    arcs: presimplified.arcs.map((arc, index) => {
      const weight = arcWeights.get(index) ?? 0
      return arc.filter(point => point[2]! >= weight || onCutLine(point)).map(([x, y]) => [x!, y!])
    }),
  }
  // filterWeight calls its weight with the ring and whether it is a hole, as sphericalRingArea reads them
  return filter(simplified, filterWeight(simplified, Number.MIN_VALUE, sphericalRingArea as unknown as RingWeighter)) as Topology<Objects>
}
