/**
 * Stream Multiplexer
 *
 * Creates a stream that fans out geometry to multiple projections.
 * Used by composite projections to render all territories simultaneously.
 *
 * When d3.geoPath renders geometry through a composite projection,
 * the multiplexed stream ensures each sub-projection receives the
 * full geometry and applies its own clipping/transform.
 */

import type { ProjectionLike, StreamLike } from '../types'

/**
 * Create a stream multiplexer for multiple projections
 *
 * @param projections - Array of projections to multiplex to
 * @returns Function that creates a multiplexed stream
 *
 * @example
 * ```typescript
 * const multiplex = createStreamMultiplexer([usaProj, alaskaProj, hawaiiProj])
 *
 * // Use as projection.stream method
 * compositeProjection.stream = multiplex
 *
 * // When d3.geoPath renders, all projections receive the geometry
 * const path = d3.geoPath(compositeProjection)
 * svg.selectAll('path')
 *   .data(countries.features)
 *   .join('path')
 *   .attr('d', path)
 * ```
 */
export function createStreamMultiplexer(
  projections: ProjectionLike[],
): (stream: StreamLike) => StreamLike {
  return (stream: StreamLike): StreamLike => {
    const streams = projections.map(p => p.stream(stream))

    return {
      point: (x: number, y: number) => {
        for (const s of streams) s.point(x, y)
      },
      lineStart: () => {
        for (const s of streams) s.lineStart()
      },
      lineEnd: () => {
        for (const s of streams) s.lineEnd()
      },
      polygonStart: () => {
        for (const s of streams) s.polygonStart()
      },
      polygonEnd: () => {
        for (const s of streams) s.polygonEnd()
      },
      sphere: () => {
        for (const s of streams) {
          if (s.sphere)
            s.sphere()
        }
      },
    }
  }
}
