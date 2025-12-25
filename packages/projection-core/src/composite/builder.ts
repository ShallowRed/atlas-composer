/**
 * Composite Projection Builder
 *
 * Creates a D3-compatible composite projection from multiple sub-projections.
 * This follows the same pattern as d3-composite-projections (albersUsa).
 *
 * The composite projection:
 * 1. Routes projection calls to the correct sub-projection based on bounds
 * 2. Multiplexes geometry streaming to all sub-projections for rendering
 * 3. Validates invert operations against territory bounds
 */

import type {
  CompositeProjectionConfig,
  GeoBounds,
  GeoBoundsArray,
  ProjectionLike,
} from '../types'

import { boundsFromArray, isPointInBounds } from '../bounds/checker'
import { invertWithBoundsValidation } from '../invert/validator'
import { createStreamMultiplexer } from '../stream/multiplexer'
import { createPointCaptureStream } from '../stream/point-capture'

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
 * Build a composite projection from sub-projection entries
 *
 * Creates a D3-compatible projection that routes geographic points to the
 * appropriate sub-projection based on territory bounds. When rendering,
 * geometry is multiplexed to all sub-projections so each territory renders
 * its portion of the world.
 *
 * @param config - Configuration with entries and optional debug flag
 * @returns D3-compatible composite projection
 *
 * @example
 * ```typescript
 * // Create sub-projections (e.g., using d3-geo)
 * const mainlandProj = d3.geoAlbers()
 *   .center([0, 38])
 *   .rotate([96, 0])
 *   .scale(1000)
 *
 * const alaskaProj = d3.geoConicEqualArea()
 *   .center([0, 64])
 *   .rotate([154, 0])
 *   .scale(400)
 *
 * // Build composite
 * const composite = buildCompositeProjection({
 *   entries: [
 *     {
 *       id: 'mainland',
 *       name: 'Mainland USA',
 *       projection: mainlandProj,
 *       bounds: { minLon: -125, minLat: 24, maxLon: -66, maxLat: 50 }
 *     },
 *     {
 *       id: 'alaska',
 *       name: 'Alaska',
 *       projection: alaskaProj,
 *       bounds: { minLon: -180, minLat: 51, maxLon: -129, maxLat: 72 }
 *     },
 *   ],
 * })
 *
 * // Use with D3
 * const path = d3.geoPath(composite)
 * svg.selectAll('path')
 *   .data(countries.features)
 *   .join('path')
 *   .attr('d', path)
 * ```
 */
export function buildCompositeProjection(
  config: CompositeProjectionConfig,
): ProjectionLike {
  const { entries, debug = false } = config

  if (entries.length === 0) {
    throw new Error('Cannot build composite projection with no entries')
  }

  // Create point capture mechanism
  const { pointStream, getCapturedPoint, resetCapture } = createPointCaptureStream()

  // Create point capture streams for each entry
  const entryStreams = entries.map(entry => ({
    entry,
    stream: entry.projection.stream(pointStream),
  }))

  // Main projection function - routes to correct sub-projection based on bounds
  const project = (coordinates: [number, number]): [number, number] | null => {
    const [lon, lat] = coordinates
    resetCapture()

    for (const { entry, stream } of entryStreams) {
      if (entry.bounds) {
        const bounds = normalizeBounds(entry.bounds)

        if (isPointInBounds(lon, lat, bounds)) {
          stream.point(lon, lat)
          const captured = getCapturedPoint()

          if (captured) {
            return captured
          }
        }
      }
    }

    return null
  }

  // Cast to ProjectionLike and add required methods
  const composite = project as ProjectionLike

  // Stream method - multiplex to all sub-projections
  composite.stream = createStreamMultiplexer(entries.map(e => e.projection))

  // Invert method - with bounds validation
  composite.invert = (coords: [number, number]) => {
    const result = invertWithBoundsValidation(coords, entries, { debug })
    return result?.coordinates ?? null
  }

  // Scale getter/setter - returns reference from first sub-projection
  composite.scale = function (_s?: number): any {
    if (arguments.length === 0) {
      return entries[0]?.projection.scale() ?? 1
    }
    // Setting scale on composite is a no-op (individual territories manage their scales)
    return composite
  } as ProjectionLike['scale']

  // Translate getter/setter - returns reference translate
  composite.translate = function (_t?: [number, number]): any {
    if (arguments.length === 0) {
      return entries[0]?.projection.translate() ?? [0, 0]
    }
    // Setting translate on composite is a no-op (individual territories manage their translates)
    return composite
  } as ProjectionLike['translate']

  return composite
}
