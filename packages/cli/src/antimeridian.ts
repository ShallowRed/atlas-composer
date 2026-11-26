/// <reference path="./d3-geo-projection.d.ts" />
import type { AreaGeometry, Position, Ring, TerritoryFeature } from '@atlas-composer/preset-library'
import type { GeoJsonTerritories } from './geojson.js'
import { rewindToRfc7946 } from '@atlas-composer/preset-library'
import { geoEquirectangular } from 'd3-geo'
import { geoProject, geoStitch } from 'd3-geo-projection'
import { mapPositions } from './geojson.js'

// In degrees, above the quantization step of world-atlas: a vertex this close to the antimeridian is on it
const ON_ANTIMERIDIAN = 1e-3

function isOnAntimeridian([longitude]: Position): boolean {
  return Math.abs(longitude!) === 180
}

/**
 * The vertices of a ring without its closing point, those near the antimeridian moved onto it, from the first vertex off
 * it: a run along the antimeridian that spans the closing point of the ring is then whole. Null for a ring along it
 */
function startOffAntimeridian(ring: Ring): Position[] | null {
  const vertices = ring.slice(0, -1).map(([longitude, latitude]): Position =>
    180 - Math.abs(longitude!) < ON_ANTIMERIDIAN ? [Math.sign(longitude!) * 180, latitude!] : [longitude!, latitude!])
  const start = vertices.findIndex(vertex => !isOnAntimeridian(vertex))
  return start === -1 ? null : [...vertices.slice(start), ...vertices.slice(0, start)]
}

/**
 * Keeps the two ends of each run of vertices along the antimeridian. Natural Earth has rings that follow it with
 * vertices on both sides, which the cut turns into a line that folds back on itself, invalid for GEOS.
 */
function tidyRing(ring: Ring): Ring | null {
  const vertices = startOffAntimeridian(ring)
  if (!vertices) {
    return null
  }
  const kept: Position[] = []
  for (const vertex of vertices) {
    const last = kept.at(-1)
    if (last && last[0] === vertex[0] && last[1] === vertex[1]) {
      continue
    }
    if (isOnAntimeridian(vertex) && last && isOnAntimeridian(last) && isOnAntimeridian(kept.at(-2) ?? [0])) {
      kept.pop()
    }
    kept.push(vertex)
  }
  return kept.length < 3 ? null : [...kept, kept[0]!]
}

function tidyPolygon(polygon: Ring[]): Ring[] | null {
  const [exterior, ...holes] = polygon.map(tidyRing)
  return exterior ? [exterior, ...holes.filter(hole => hole !== null)] : null
}

function tidy(geometry: AreaGeometry): AreaGeometry {
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: tidyPolygon(geometry.coordinates) ?? geometry.coordinates }
  }
  return { type: 'MultiPolygon', coordinates: geometry.coordinates.map(tidyPolygon).filter(polygon => polygon !== null) }
}

/**
 * Turns the built territories into GeoJSON features as RFC 7946 describes them: the rings cut at the antimeridian
 * and oriented with the exterior counterclockwise.
 */
export function toRfc7946(territories: { type: 'FeatureCollection', features: TerritoryFeature[] }): GeoJsonTerritories {
  // d3-geo cuts the rings at the antimeridian. geoProject tells an exterior ring from a hole in a plane
  // with the y axis down: the projection gives the longitude and the opposite of the latitude
  const cut = geoProject(territories, geoEquirectangular().scale(180 / Math.PI).translate([0, 0]).precision(0))

  return {
    type: 'FeatureCollection',
    features: cut.features.map(({ properties, geometry }) => ({
      type: 'Feature',
      properties,
      geometry: rewindToRfc7946(tidy(mapPositions(geometry, ([x, y]) => [x!, -y!]))),
    })),
  }
}

/**
 * Joins the pieces of a territory that Natural Earth cuts at the antimeridian, for a projection that cuts elsewhere:
 * geoStitch removes the runs of the rings along the antimeridian and joins the pieces whose ends meet there
 */
export function stitchAtAntimeridian(territory: TerritoryFeature): TerritoryFeature {
  const rotate = (ring: Ring): Ring => {
    const vertices = startOffAntimeridian(ring)
    return vertices ? [...vertices, vertices[0]!] : ring
  }
  const { geometry } = territory
  const rotated: AreaGeometry = geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: geometry.coordinates.map(rotate) }
    : { type: 'MultiPolygon', coordinates: geometry.coordinates.map(polygon => polygon.map(rotate)) }
  return { ...territory, geometry: geoStitch(rotated) }
}
