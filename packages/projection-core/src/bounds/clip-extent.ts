/**
 * Clip Extent Calculator
 *
 * Pure functions for calculating clip extents from geographic bounds
 * or pixel offsets. Used by composite projections to properly clip
 * each territory's rendering area.
 */

import type { ClipExtentOptions, GeoBounds, ProjectionLike } from '../types'

/**
 * Calculate clip extent from geographic bounds
 *
 * Projects the corner points of geographic bounds to get the corresponding
 * screen coordinates for clipping. This is critical for composite projections
 * to ensure each territory only renders within its designated area.
 *
 * @param projection - The projection to use for transforming bounds
 * @param bounds - Geographic bounds { minLon, minLat, maxLon, maxLat }
 * @param options - Optional configuration (epsilon for padding)
 * @returns Clip extent [[x0, y0], [x1, y1]] or null if projection fails
 *
 * @example
 * ```typescript
 * const bounds = { minLon: -10, minLat: 35, maxLon: 5, maxLat: 45 }
 * const clipExtent = calculateClipExtentFromBounds(projection, bounds)
 *
 * if (clipExtent) {
 *   projection.clipExtent(clipExtent)
 * }
 * ```
 */
export function calculateClipExtentFromBounds(
  projection: ProjectionLike,
  bounds: GeoBounds,
  options: ClipExtentOptions = {},
): [[number, number], [number, number]] | null {
  const { epsilon = 1e-6 } = options

  // Project the corner points
  // Note: Geographic coordinates are [lon, lat] where:
  // - minLon is west, maxLon is east
  // - minLat is south, maxLat is north
  // In screen coordinates:
  // - topLeft corresponds to [minLon, maxLat] (northwest corner)
  // - bottomRight corresponds to [maxLon, minLat] (southeast corner)
  const topLeft = projection([
    bounds.minLon + epsilon,
    bounds.maxLat - epsilon,
  ])
  const bottomRight = projection([
    bounds.maxLon - epsilon,
    bounds.minLat + epsilon,
  ])

  if (!topLeft || !bottomRight) {
    return null
  }

  return [
    [topLeft[0], topLeft[1]],
    [bottomRight[0], bottomRight[1]],
  ]
}

/**
 * Calculate clip extent from pixel offsets
 *
 * Converts a pixel-based clip extent (relative to territory center)
 * to absolute screen coordinates. Used when clip extent is stored
 * as offsets in exported configurations.
 *
 * @param center - The territory center in screen coordinates [x, y]
 * @param pixelClipExtent - Pixel offsets [x1, y1, x2, y2] relative to center
 * @param epsilon - Small value for padding (default: 1e-6)
 * @returns Clip extent [[x0, y0], [x1, y1]] in absolute screen coordinates
 *
 * @example
 * ```typescript
 * const center = [400, 300] // Territory center in pixels
 * const offsets = [-100, -80, 100, 80] // Relative clip bounds
 *
 * const clipExtent = calculateClipExtentFromPixelOffset(center, offsets)
 * // [[300, 220], [500, 380]]
 *
 * projection.clipExtent(clipExtent)
 * ```
 */
export function calculateClipExtentFromPixelOffset(
  center: [number, number],
  pixelClipExtent: [number, number, number, number],
  epsilon = 1e-6,
): [[number, number], [number, number]] {
  const [x1, y1, x2, y2] = pixelClipExtent

  return [
    [center[0] + x1 + epsilon, center[1] + y1 + epsilon],
    [center[0] + x2 - epsilon, center[1] + y2 - epsilon],
  ]
}
