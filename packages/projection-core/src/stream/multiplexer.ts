import type { ProjectionLike, StreamLike } from '../types'

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
