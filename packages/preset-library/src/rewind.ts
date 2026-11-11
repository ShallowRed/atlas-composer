export type Position = number[]
export type Ring = Position[]

export interface PolygonGeometry {
  type: 'Polygon'
  coordinates: Ring[]
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon'
  coordinates: Ring[][]
}

export type AreaGeometry = PolygonGeometry | MultiPolygonGeometry

// In square degrees: below it, a ring of Natural Earth is a line of aligned points
const FLAT_AREA = 1e-12

// Twice the signed area of a ring in a plane with the y axis up: positive for a counterclockwise ring
function signedArea(ring: Ring): number {
  let area = 0
  for (let index = 0; index < ring.length - 1; index++) {
    const [x0, y0] = ring[index]!
    const [x1, y1] = ring[index + 1]!
    area += x0! * y1! - x1! * y0!
  }
  return area
}

export function longitudeSpan(ring: Ring): number {
  let min = Infinity
  let max = -Infinity
  for (const [longitude] of ring) {
    min = Math.min(min, longitude!)
    max = Math.max(max, longitude!)
  }
  return max - min
}

function orient(geometry: AreaGeometry, exteriorCounterclockwise: boolean, keep: (ring: Ring) => boolean): AreaGeometry {
  const orientPolygon = (polygon: Ring[]) => polygon.map((ring, index) => {
    if (keep(ring)) {
      return ring
    }
    const counterclockwise = signedArea(ring) > 0
    const wanted = index === 0 ? exteriorCounterclockwise : !exteriorCounterclockwise
    return counterclockwise === wanted ? ring : [...ring].reverse()
  })
  return geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: orientPolygon(geometry.coordinates) }
    : { type: 'MultiPolygon', coordinates: geometry.coordinates.map(orientPolygon) }
}

/**
 * Orients the rings of a geometry in longitude and latitude as d3-geo reads them: exterior rings clockwise.
 * A ring that spans more than 180° of longitude crosses the antimeridian and keeps its orientation,
 * since its planar orientation says nothing of its spherical one.
 */
export function rewindToD3(geometry: AreaGeometry): AreaGeometry {
  return orient(geometry, false, ring => longitudeSpan(ring) > 180)
}

/**
 * Removes the polygons whose exterior ring has no area, such as a ring of aligned points of Natural Earth at 10m:
 * neither a plane nor d3-geo can give it an orientation, and d3-geo reads it as the whole sphere.
 */
export function withoutFlatPolygons(geometry: AreaGeometry): AreaGeometry {
  if (geometry.type === 'Polygon') {
    return geometry
  }
  const polygons = geometry.coordinates.filter(polygon => polygon[0] !== undefined && Math.abs(signedArea(polygon[0])) / 2 >= FLAT_AREA)
  // A territory made of flat polygons only, such as the Vatican at 10m, keeps them
  return polygons.length > 0 ? { type: 'MultiPolygon', coordinates: polygons } : geometry
}

/** Orients the rings of a planar geometry as RFC 7946, section 3.1.6, asks: exterior rings counterclockwise. */
export function rewindToRfc7946(geometry: AreaGeometry): AreaGeometry {
  return orient(geometry, true, () => false)
}
