import type { ProjectionLike, StreamLike } from '../types'

/**
 * Creates a stream multiplexer that broadcasts geographic data to multiple projection streams.
 *
 * The projections must have mutually exclusive clip regions on the sphere,
 * as this will avoid emitting interleaving lines and polygons.
 *
 * Derived from the `multiplex()` function in d3-geo's geoAlbersUsa by Mike Bostock (ISC License).
 * @see https://github.com/d3/d3-geo/blob/main/src/projection/albersUsa.js
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
