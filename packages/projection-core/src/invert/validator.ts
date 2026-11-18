import type { GeoBounds, GeoBoundsArray, InvertOptions, InvertResult, SubProjectionEntry } from '../types'

import { boundsFromArray, isPointInBounds } from '../bounds/checker'

function normalizeBounds(bounds: GeoBounds | GeoBoundsArray): GeoBounds {
  if ('minLon' in bounds) {
    return bounds
  }
  return boundsFromArray(bounds)
}

function isPointInExtent(x: number, y: number, [[x0, y0], [x1, y1]]: [[number, number], [number, number]]): boolean {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

export function invertWithBoundsValidation(
  screenCoords: [number, number],
  entries: SubProjectionEntry[],
  options: InvertOptions = {},
): InvertResult | null {
  const { tolerance = 0.01, debug = false } = options
  const [x, y] = screenCoords

  // A sub-projection drawn later covers the ones before it: the pixel belongs to the last one whose clip extent contains the pixel and whose bounds contain its inverse
  for (const entry of [...entries].reverse()) {
    const { projection, bounds, id } = entry

    if (!projection.invert) {
      continue
    }

    const clipExtent = projection.clipExtent?.()
    if (clipExtent && !isPointInExtent(x, y, clipExtent)) {
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
