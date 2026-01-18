import type { GeoBounds, GeoBoundsArray } from '../types'

export function isPointInBounds(
  lon: number,
  lat: number,
  bounds: GeoBounds,
  tolerance = 0,
): boolean {
  return (
    lon >= bounds.minLon - tolerance
    && lon <= bounds.maxLon + tolerance
    && lat >= bounds.minLat - tolerance
    && lat <= bounds.maxLat + tolerance
  )
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
