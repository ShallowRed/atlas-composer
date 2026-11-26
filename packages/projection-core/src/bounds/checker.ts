import type { GeoBounds, GeoBoundsArray } from '../types'

// A box whose minLon exceeds maxLon crosses the antimeridian, as geoBounds of d3-geo writes it: it holds the longitudes from minLon to 180 and from -180 to maxLon
export function isPointInBounds(
  lon: number,
  lat: number,
  bounds: GeoBounds,
  tolerance = 0,
): boolean {
  const west = lon >= bounds.minLon - tolerance
  const east = lon <= bounds.maxLon + tolerance
  return (bounds.minLon > bounds.maxLon ? west || east : west && east)
    && lat >= bounds.minLat - tolerance
    && lat <= bounds.maxLat + tolerance
}

export function boundsFromArray(bounds: GeoBoundsArray): GeoBounds {
  return {
    minLon: bounds[0][0],
    minLat: bounds[0][1],
    maxLon: bounds[1][0],
    maxLat: bounds[1][1],
  }
}

export function boundsToArray(bounds: GeoBounds): GeoBoundsArray {
  return [
    [bounds.minLon, bounds.minLat],
    [bounds.maxLon, bounds.maxLat],
  ]
}
