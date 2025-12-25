/**
 * Point Capture Stream
 *
 * Creates a stream that captures projected point coordinates.
 * Used by composite projections to determine which sub-projection
 * successfully projects a geographic point.
 *
 * The pattern follows d3-composite-projections (albersUsa) approach:
 * 1. Create a point stream that stores the projected coordinates
 * 2. Pipe geographic coordinates through each sub-projection's stream
 * 3. Check if the point was captured (projection succeeded)
 */

import type { PointCaptureResult, StreamLike } from '../types'

/**
 * Create a point capture stream for projection routing
 *
 * @returns Object with pointStream, getCapturedPoint, and resetCapture
 *
 * @example
 * ```typescript
 * const { pointStream, getCapturedPoint, resetCapture } = createPointCaptureStream()
 *
 * // Create capture stream for a projection
 * const captureStream = projection.stream(pointStream)
 *
 * // Project a point
 * resetCapture()
 * captureStream.point(longitude, latitude)
 *
 * // Check result
 * const projected = getCapturedPoint()
 * if (projected) {
 *   console.log(`Projected to [${projected[0]}, ${projected[1]}]`)
 * }
 * ```
 */
export function createPointCaptureStream(): PointCaptureResult {
  let capturedPoint: [number, number] | null = null

  const pointStream: StreamLike = {
    point: (x: number, y: number) => {
      capturedPoint = [x, y]
    },
    lineStart: () => {},
    lineEnd: () => {},
    polygonStart: () => {},
    polygonEnd: () => {},
    sphere: () => {},
  }

  return {
    pointStream,
    getCapturedPoint: () => capturedPoint,
    resetCapture: () => {
      capturedPoint = null
    },
  }
}
