/**
 * Bounds Checker
 *
 * Pure functions for checking if geographic points fall within bounds.
 * Used by composite projections to route points to the correct sub-projection.
 */

import type { GeoBounds, GeoBoundsArray } from '../types'

/**
 * Check if a geographic point is within the given bounds
 *
 * @param lon - Longitude of the point
 * @param lat - Latitude of the point
 * @param bounds - Geographic bounds to check against
 * @param tolerance - Optional tolerance for edge cases (default: 0)
 * @returns True if the point is within bounds
 *
 * @example
 * ```typescript
 * const bounds = { minLon: -10, minLat: 35, maxLon: 5, maxLat: 45 }
 *
 * isPointInBounds(-5, 40, bounds) // true (inside Portugal/Spain)
 * isPointInBounds(10, 50, bounds) // false (outside bounds)
 * isPointInBounds(-10, 35, bounds, 0.01) // true (on edge, with tolerance)
 * ```
 */
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

/**
 * Convert a bounds array to a GeoBounds object
 *
 * @param bounds - Bounds array [[minLon, minLat], [maxLon, maxLat]]
 * @returns GeoBounds object
 *
 * @example
 * ```typescript
 * const arrayBounds: GeoBoundsArray = [[-10, 35], [5, 45]]
 * const objectBounds = boundsFromArray(arrayBounds)
 * // { minLon: -10, minLat: 35, maxLon: 5, maxLat: 45 }
 * ```
 */
export function boundsFromArray(bounds: GeoBoundsArray): GeoBounds {
  return {
    minLon: bounds[0][0],
    minLat: bounds[0][1],
    maxLon: bounds[1][0],
    maxLat: bounds[1][1],
  }
}

/**
 * Convert a GeoBounds object to a bounds array
 *
 * @param bounds - GeoBounds object
 * @returns Bounds array [[minLon, minLat], [maxLon, maxLat]]
 *
 * @example
 * ```typescript
 * const objectBounds = { minLon: -10, minLat: 35, maxLon: 5, maxLat: 45 }
 * const arrayBounds = boundsToArray(objectBounds)
 * // [[-10, 35], [5, 45]]
 * ```
 */
export function boundsToArray(bounds: GeoBounds): GeoBoundsArray {
  return [
    [bounds.minLon, bounds.minLat],
    [bounds.maxLon, bounds.maxLat],
  ]
}
