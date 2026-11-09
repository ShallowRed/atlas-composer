import type { GeoBounds, ProjectionLike } from '../types'
import { calculateClipExtentFromBounds, calculateClipExtentFromPixelOffset } from './clip-extent'

export interface RenderingParameters {
  clipAngle?: number
  precision?: number
  pixelClipExtent?: [number, number, number, number]
  bounds?: GeoBounds
}

// To call after the scale and the translate of the projection are set: the bounds are projected to pixels
export function applyRenderingParameters(
  projection: ProjectionLike,
  { clipAngle, precision, pixelClipExtent, bounds }: RenderingParameters,
  translate: [number, number],
): void {
  if (clipAngle !== undefined) {
    projection.clipAngle?.(clipAngle)
  }
  if (precision !== undefined) {
    projection.precision?.(precision)
  }

  const clipExtent = pixelClipExtent
    ? calculateClipExtentFromPixelOffset(translate, pixelClipExtent)
    : bounds && calculateClipExtentFromBounds(projection, bounds)
  if (clipExtent) {
    projection.clipExtent?.(clipExtent)
  }
}
