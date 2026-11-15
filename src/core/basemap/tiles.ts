import type { Extent } from './frames'

type Point = [number, number]

export interface InvertibleProjection {
  (point: Point): Point | null
  invert?: (point: Point) => Point | null
}

const MAX_MERCATOR_LATITUDE = 85.0511287798

const clampLatitude = (latitude: number) => Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, latitude))
const wrapLongitude = (longitude: number) => ((((longitude + 180) % 360) + 360) % 360) - 180

// Position of a point in the Web Mercator tile grid of a zoom, in tiles (the integer parts are the tile)
export function tileOf([longitude, latitude]: Point, zoom: number): Point {
  const n = 2 ** zoom
  const phi = clampLatitude(latitude) * Math.PI / 180
  return [
    (wrapLongitude(longitude) + 180) / 360 * n,
    (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2 * n,
  ]
}

// Position of a point in the Web Mercator square of side 1
function mercator(point: Point): Point {
  return tileOf(point, 0)
}

// The smallest zoom whose tile pixel covers at most one canvas pixel at the corners and the center of the frame, among those on the globe and within the Web Mercator latitudes
export function zoomForFrame(projection: InvertibleProjection, [[x0, y0], [x1, y1]]: Extent, pixelRatio: number, tileSize: number, maxZoom: number): number {
  const step = 1 / pixelRatio
  const samples: Point[] = [[x0, y0], [x1 - step, y0], [x0, y1 - step], [x1 - step, y1 - step], [(x0 + x1) / 2, (y0 + y1) / 2]]
  let finest = Infinity
  for (const [x, y] of samples) {
    const here = invertOnGlobe(projection, [x, y])
    const right = invertOnGlobe(projection, [x + step, y])
    const below = invertOnGlobe(projection, [x, y + step])
    if (!here || !right || !below || [here, right, below].some(([, latitude]) => Math.abs(latitude) > MAX_MERCATOR_LATITUDE)) {
      continue
    }
    const [mx, my] = mercator(here)
    const [rx, ry] = mercator(right)
    const [bx, by] = mercator(below)
    // Across the antimeridian, a step of one pixel wraps around the square
    const dx = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b))
    finest = Math.min(finest, Math.hypot(dx(rx, mx), ry - my), Math.hypot(dx(bx, mx), by - my))
  }
  if (!Number.isFinite(finest) || finest <= 0) {
    return 0
  }
  return Math.max(0, Math.min(maxZoom, Math.ceil(Math.log2(1 / (tileSize * finest)))))
}

// Spacing of the points of a frame whose tiles cover it: thinner than two pixels, the strip of a tile along the clip of an inset leaves no visible gap
const COVERAGE_STEP = 2

// The tiles of a zoom that the points of the globe in a frame touch, on a grid and along the edges: insets drawn inside one projection, the antimeridian and the poles need no other rule.
// The generator visits one column of the grid at each step, so that a caller can go back to the event loop between two steps, and returns the tiles
export function* coverFrame(projection: InvertibleProjection, [[x0, y0], [x1, y1]]: Extent, zoom: number): Generator<void, Point[]> {
  const tiles = new Map<string, Point>()
  const positions = (start: number, end: number) => [start, ...Array.from({ length: Math.ceil((end - start) / COVERAGE_STEP) }, (_, i) => Math.min(end - 0.5, start + i * COVERAGE_STEP + COVERAGE_STEP / 2)), end - 0.5]
  const ys = positions(y0, y1)
  for (const x of positions(x0, x1)) {
    for (const y of ys) {
      const inverse = invertOnGlobe(projection, [x, y])
      if (inverse) {
        const [tx, ty] = tileOf(inverse, zoom).map(Math.floor) as Point
        tiles.set(`${tx},${ty}`, [tx, ty])
      }
    }
    yield
  }
  return [...tiles.values()]
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
