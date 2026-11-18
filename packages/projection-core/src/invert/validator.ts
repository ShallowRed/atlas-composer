import type { GeoBounds, GeoBoundsArray, InvertOptions, InvertResult, SubProjectionEntry } from '../types'

import { boundsFromArray, isPointInBounds } from '../bounds/checker'
import { inExtent } from '../bounds/clip-extent'

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

  // A sub-projection drawn later covers the ones before it: the last one whose clip extent contains the pixel draws it, and a sub-projection without clip extent draws every pixel
  const entry = [...entries].reverse().find(({ projection }) => {
    const clipExtent = projection.clipExtent?.()
    return !clipExtent || inExtent(clipExtent, [x, y])
  })
  if (!entry?.projection.invert) {
    if (debug) {
      console.log(`[Invert] No sub-projection inverts [${x}, ${y}]`)
    }
    return null
  }

  const { bounds, id } = entry
  let result: [number, number] | null
  try {
    result = entry.projection.invert([x, y])
  }
  catch (error) {
    if (debug) {
      console.warn(`[Invert] Error in ${id}:`, error)
    }
    return null
  }

  if (!result || !Array.isArray(result) || result.length < 2) {
    return null
  }

  const [lon, lat] = result
  if (bounds && !isPointInBounds(lon, lat, normalizeBounds(bounds), tolerance)) {
    if (debug) {
      console.log(`[Invert] Rejected ${id}: [${lon}, ${lat}] outside bounds`)
    }
    return null
  }

  if (debug) {
    console.log(`[Invert] Matched ${id}: [${x}, ${y}] -> [${lon}, ${lat}]`)
  }
  return { coordinates: result, territoryId: id }
}
