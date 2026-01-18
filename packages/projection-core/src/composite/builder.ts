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

function normalizeBounds(bounds: GeoBounds | GeoBoundsArray): GeoBounds {
  if ('minLon' in bounds) {
    return bounds
  }
  return boundsFromArray(bounds)
}

export function buildCompositeProjection(
  config: CompositeProjectionConfig,
): ProjectionLike {
  const { entries, debug = false } = config

  if (entries.length === 0) {
    throw new Error('Cannot build composite projection with no entries')
  }

  const { pointStream, getCapturedPoint, resetCapture } = createPointCaptureStream()

  const entryStreams = entries.map(entry => ({
    entry,
    stream: entry.projection.stream(pointStream),
  }))

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

  const composite = project as ProjectionLike

  composite.stream = createStreamMultiplexer(entries.map(e => e.projection))

  composite.invert = (coords: [number, number]) => {
    const result = invertWithBoundsValidation(coords, entries, { debug })
    return result?.coordinates ?? null
  }

  composite.scale = function (_s?: number): any {
    if (arguments.length === 0) {
      return entries[0]?.projection.scale() ?? 1
    }
    return composite
  } as ProjectionLike['scale']

  composite.translate = function (_t?: [number, number]): any {
    if (arguments.length === 0) {
      return entries[0]?.projection.translate() ?? [0, 0]
    }
    return composite
  } as ProjectionLike['translate']

  return composite
}
