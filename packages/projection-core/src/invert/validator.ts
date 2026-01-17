import type { GeoBounds, GeoBoundsArray, InvertOptions, InvertResult, SubProjectionEntry } from '../types'

import { boundsFromArray, isPointInBounds } from '../bounds/checker'

function normalizeBounds(bounds: GeoBounds | GeoBoundsArray): GeoBounds {
  if ('minLon' in bounds) {
    return bounds
  }
  return boundsFromArray(bounds)
}

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
