import { geoBounds } from 'd3-geo'

type Point = [number, number]
type Extent = [[number, number], [number, number]]

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

// The tiles of a zoom that cover a frame: the bounds of its outline in longitude and latitude, west greater than east across the antimeridian
export function tilesForFrame(projection: InvertibleProjection, [[x0, y0], [x1, y1]]: Extent, zoom: number): Point[] {
  const outline: Point[] = []
  const edge = (from: Point, to: Point) => {
    const count = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 4))
    for (let i = 0; i < count; i++) {
      const point = projection.invert?.([from[0] + (to[0] - from[0]) * i / count, from[1] + (to[1] - from[1]) * i / count])
      if (point && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
        outline.push(point)
      }
    }
  }
  edge([x0, y0], [x1, y0])
  edge([x1, y0], [x1, y1])
  edge([x1, y1], [x0, y1])
  edge([x0, y1], [x0, y0])
  if (outline.length === 0) {
    return []
  }
  let [[west, south], [east, north]] = geoBounds({ type: 'LineString', coordinates: [...outline, outline[0]!] })
  const inFrame = (point: Point) => {
    const projected = projection(point)
    return projected !== null && projected[0] >= x0 && projected[0] <= x1 && projected[1] >= y0 && projected[1] <= y1
  }
  // A frame that contains a pole reaches it on every longitude
  if (inFrame([0, 90])) {
    [west, east, north] = [-180, 180, MAX_MERCATOR_LATITUDE]
  }
  if (inFrame([0, -90])) {
    [west, east, south] = [-180, 180, -MAX_MERCATOR_LATITUDE]
  }
  const n = 2 ** zoom
  const [, yNorth] = tileOf([0, north], zoom)
  const [, ySouth] = tileOf([0, south], zoom)
  const xWest = Math.floor(tileOf([west, 0], zoom)[0])
  const xEast = Math.min(n - 1, Math.floor(tileOf([east === 180 ? 179.999999 : east, 0], zoom)[0]))
  const columns = west <= east
    ? Array.from({ length: xEast - xWest + 1 }, (_, i) => xWest + i)
    : [...Array.from({ length: n - xWest }, (_, i) => xWest + i), ...Array.from({ length: xEast + 1 }, (_, i) => i)]
  const tiles: Point[] = []
  for (let y = Math.max(0, Math.floor(yNorth)); y <= Math.min(n - 1, Math.floor(ySouth)); y++) {
    for (const x of columns) {
      tiles.push([x, y])
    }
  }
  return tiles
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
