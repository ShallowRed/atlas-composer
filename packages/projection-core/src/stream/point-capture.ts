import type { PointCaptureResult, StreamLike } from '../types'

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
