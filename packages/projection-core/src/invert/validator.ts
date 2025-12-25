/**
 * Invert Validator
 *
 * Validates inverted coordinates against territory bounds to ensure
 * correct territory matching. This is critical for composite projections
 * where multiple territories may overlap in screen space.
 */

import type { GeoBounds, GeoBoundsArray, InvertOptions, InvertResult, SubProjectionEntry } from '../types'

import { boundsFromArray, isPointInBounds } from '../bounds/checker'

/**
 * Normalize bounds to GeoBounds format
 */
function normalizeBounds(bounds: GeoBounds | GeoBoundsArray): GeoBounds {
  if ('minLon' in bounds) {
    return bounds
  }
  return boundsFromArray(bounds)
}

/**
 * Invert screen coordinates with bounds validation
 *
 * Tries each sub-projection's invert method and validates the result
 * against the territory's geographic bounds. This ensures that when
 * multiple territories overlap in screen space (common in composite
 * projections), the correct territory is identified.
 *
 * @param screenCoords - Screen coordinates [x, y] to invert
 * @param entries - Array of sub-projection entries with bounds
 * @param options - Optional configuration (tolerance, debug)
 * @returns InvertResult with coordinates and territoryId, or null if no match
 *
 * @example
 * ```typescript
 * const entries = [
 *   { id: 'mainland', projection: mainlandProj, bounds: mainlandBounds },
 *   { id: 'alaska', projection: alaskaProj, bounds: alaskaBounds },
 * ]
 *
 * const result = invertWithBoundsValidation([400, 300], entries)
 *
 * if (result) {
 *   console.log(`Clicked on ${result.territoryId} at [${result.coordinates}]`)
 * }
 * ```
 */
export function invertWithBoundsValidation(
  screenCoords: [number, number],
  entries: SubProjectionEntry[],
  options: InvertOptions = {},
): InvertResult | null {
  const { tolerance = 0.01, debug = false } = options
  const [x, y] = screenCoords

  for (const entry of entries) {
    const { projection, bounds, id } = entry

    if (!projection.invert) {
      continue
    }

    try {
      const result = projection.invert([x, y])

      if (!result || !Array.isArray(result) || result.length < 2) {
        continue
      }

      const [lon, lat] = result

      if (bounds) {
        const geoBounds = normalizeBounds(bounds)

        if (isPointInBounds(lon, lat, geoBounds, tolerance)) {
          if (debug) {
            console.log(`[Invert] Matched ${id}: [${x}, ${y}] -> [${lon}, ${lat}]`)
          }
          return { coordinates: result as [number, number], territoryId: id }
        }
        else if (debug) {
          console.log(`[Invert] Rejected ${id}: [${lon}, ${lat}] outside bounds`)
        }
      }
      else {
        // No bounds available, accept first successful invert (legacy behavior)
        if (debug) {
          console.log(`[Invert] No bounds for ${id}, accepting [${lon}, ${lat}]`)
        }
        return { coordinates: result as [number, number], territoryId: id }
      }
    }
    catch (error) {
      if (debug) {
        console.warn(`[Invert] Error in ${id}:`, error)
      }
    }
  }

  if (debug) {
    console.log(`[Invert] Failed to invert [${x}, ${y}]`)
  }

  return null
}
