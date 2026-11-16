import type { GeoProjection } from 'd3-geo'

type Point = [number, number]

export type Extent = [[number, number], [number, number]]

// A projection and the rectangle of the canvas that it draws, in the order in which a figure draws them
export interface ProjectionFrame {
  code: string
  projection: GeoProjection
  extent: Extent
}

export interface InvertibleProjection {
  (point: Point): Point | null
  invert?: (point: Point) => Point | null
}

export function inExtent([[x0, y0], [x1, y1]]: Extent, [x, y]: [number, number]): boolean {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

// A frame drawn later covers the labels of the frames under it
export function visibleLabels<L extends { frame: number, x: number, y: number }>(labels: L[], frames: Pick<ProjectionFrame, 'extent'>[]): L[] {
  return labels.filter(({ frame, x, y }) => !frames.some(({ extent }, index) => index > frame && inExtent(extent, [x, y])))
}

const ROUND_TRIP_TOLERANCE = 0.5

// The longitude and latitude of a pixel, when they project back to it within half a pixel: outside the globe, the inverse returns a point that projects elsewhere
export function invertOnGlobe(projection: InvertibleProjection, point: Point): Point | null {
  const inverse = projection.invert?.(point)
  if (!inverse || !Number.isFinite(inverse[0]) || !Number.isFinite(inverse[1])) {
    return null
  }
  const back = projection(inverse)
  return back !== null && Math.abs(back[0] - point[0]) <= ROUND_TRIP_TOLERANCE && Math.abs(back[1] - point[1]) <= ROUND_TRIP_TOLERANCE ? inverse : null
}
