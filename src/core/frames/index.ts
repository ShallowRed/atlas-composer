import type { GeoStreamWrapper } from 'd3-geo'

type Point = [number, number]

export type Extent = [[number, number], [number, number]]

// A projection and the rectangle of the canvas that it draws, in the order in which a figure draws them
export interface ProjectionFrame {
  code: string
  projection: FrameProjection
  extent: Extent
}

export interface InvertibleProjection {
  (point: Point): Point | null
  invert?: (point: Point) => Point | null
}

// What the readers of a frame call on its projection: a d3 projection and a sub-projection of the loader both provide it
interface FrameProjection extends InvertibleProjection, GeoStreamWrapper {
  clipAngle?: () => number | null
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
  // Above the globe, the inverse of a Natural Earth can give a latitude beyond a pole that projects back to the pixel
  if (!inverse || !Number.isFinite(inverse[0]) || !(Math.abs(inverse[1]) <= 90)) {
    return null
  }
  const back = projection(inverse)
  return back !== null && Math.abs(back[0] - point[0]) <= ROUND_TRIP_TOLERANCE && Math.abs(back[1] - point[1]) <= ROUND_TRIP_TOLERANCE ? inverse : null
}

// The scale k from the origin of the view and the translation t that carry the previous projection of a frame onto the current one
export interface FrameMapping {
  k: number
  t: Point
}

// A rectangle of the image of a previous render, and the rectangle of the current view that shows it
export interface FramePlacement {
  code: string
  from: Extent
  to: Extent
}

const MAPPING_TOLERANCE = 0.5

const mapPoint = ({ k, t }: FrameMapping, [x, y]: Point): Point => [k * x + t[0], k * y + t[1]]

// The current projection of a frame equals the previous one up to a scale and a translation: the scale comes from the center of the previous frame and a point halfway to one of its corners, and the relation is checked on every point among the center, the halfway points and the corners that the previous frame draws on the globe
export function frameMapping(previous: ProjectionFrame, current: ProjectionFrame): FrameMapping | null {
  // A built-in composite projection has no clipAngle
  if ((previous.projection.clipAngle?.() ?? null) !== (current.projection.clipAngle?.() ?? null)) {
    return null
  }
  const [[x0, y0], [x1, y1]] = previous.extent
  const center: Point = [(x0 + x1) / 2, (y0 + y1) / 2]
  const corners: Point[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  const halfway = corners.map(([x, y]): Point => [(center[0] + x) / 2, (center[1] + y) / 2])
  const located = (point: Point) => {
    const geographic = invertOnGlobe(previous.projection, point)
    const projected = geographic && current.projection(geographic)
    return projected ? { point, projected } : null
  }
  const origin = located(center)
  const around = halfway.map(located)
  const firstPair = around.findIndex((a, i) => a && around[(i + 1) % around.length])
  if (!origin || firstPair === -1) {
    return null
  }
  const a = around[firstPair]!
  const k = Math.hypot(a.projected[0] - origin.projected[0], a.projected[1] - origin.projected[1])
    / Math.hypot(a.point[0] - origin.point[0], a.point[1] - origin.point[1])
  const mapping: FrameMapping = { k, t: [origin.projected[0] - k * center[0], origin.projected[1] - k * center[1]] }
  const checked = [origin, ...around, ...corners.map(located)].filter(located => located !== null)
  const holds = checked.every(({ point, projected }) => {
    const [x, y] = mapPoint(mapping, point)
    return Math.abs(x - projected[0]) <= MAPPING_TOLERANCE && Math.abs(y - projected[1]) <= MAPPING_TOLERANCE
  })
  return holds ? mapping : null
}

// For each current frame whose projection is the previous one of its code up to a scale and a translation, the part of the previous image that it shows
export function provisionalPlacements(previous: ProjectionFrame[], current: ProjectionFrame[]): FramePlacement[] {
  const previousByCode = new Map(previous.map(frame => [frame.code, frame]))
  return current.flatMap((frame) => {
    const before = previousByCode.get(frame.code)
    const mapping = before && frameMapping(before, frame)
    if (!mapping) {
      return []
    }
    const [[px0, py0], [px1, py1]] = [mapPoint(mapping, before.extent[0]), mapPoint(mapping, before.extent[1])]
    const [[cx0, cy0], [cx1, cy1]] = frame.extent
    const to: Extent = [[Math.max(px0, cx0), Math.max(py0, cy0)], [Math.min(px1, cx1), Math.min(py1, cy1)]]
    if (to[0][0] >= to[1][0] || to[0][1] >= to[1][1]) {
      return []
    }
    const back = ([x, y]: Point): Point => [(x - mapping.t[0]) / mapping.k, (y - mapping.t[1]) / mapping.k]
    return [{ code: frame.code, from: [back(to[0]), back(to[1])], to }]
  })
}
