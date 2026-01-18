import type { ClipExtentOptions, GeoBounds, ProjectionLike } from '../types'

export function calculateClipExtentFromBounds(
  projection: ProjectionLike,
  bounds: GeoBounds,
  options: ClipExtentOptions = {},
): [[number, number], [number, number]] | null {
  const { epsilon = 1e-6 } = options

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
