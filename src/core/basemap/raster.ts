import type { Extent, InvertibleProjection } from '@/core/frames'
import { invertOnGlobe } from '@/core/frames'
import { tileOf } from './tiles'

// A position in the Web Mercator tile grid of a zoom, in tiles
type TilePoint = [number, number]

// Side of a cell of the grid on which the projection is inverted, in pixels of the image
const GRID_STEP = 8
// Largest gap, in pixels of tile, between the interpolated and the exact position of the center of a cell
const GRID_TOLERANCE = 1 / 8

// Reads the tiles of a zoom by bilinear interpolation of the four nearest pixels, across the edges of the tiles and the antimeridian; a neighbor in a missing tile reads the edge pixel of the tile of the point, and a point in a missing tile is not drawn
export function sampleTiles(tiles: Map<string, Uint8ClampedArray | null>, n: number, tileSize: number) {
  const tileAt = (x: number, y: number) => tiles.get(`${((x % n) + n) % n},${y}`) ?? null
  const corner = { data: null as Uint8ClampedArray | null, offset: 0 }
  // The tile and the offset of a pixel of the global grid, or the nearest pixel of the base tile when its tile is missing
  const locate = (px: number, py: number, base: Uint8ClampedArray, baseX: number, baseY: number) => {
    const tileX = Math.floor(px / tileSize)
    const tileY = Math.floor(py / tileSize)
    let data = tileX === baseX && tileY === baseY ? base : (py >= 0 && py < n * tileSize ? tileAt(tileX, tileY) : null)
    if (!data) {
      data = base
      px = Math.min(Math.max(px, baseX * tileSize), baseX * tileSize + tileSize - 1)
      py = Math.min(Math.max(py, baseY * tileSize), baseY * tileSize + tileSize - 1)
    }
    corner.data = data
    corner.offset = ((py - Math.floor(py / tileSize) * tileSize) * tileSize + (px - Math.floor(px / tileSize) * tileSize)) * 4
  }
  return (fx: number, fy: number, out: Uint8ClampedArray, o: number): boolean => {
    const baseX = Math.floor(fx)
    const baseY = Math.floor(fy)
    const base = tileAt(baseX, baseY)
    if (!base) {
      return false
    }
    const gx = fx * tileSize - 0.5
    const gy = fy * tileSize - 0.5
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const wx = gx - x0
    const wy = gy - y0
    locate(x0, y0, base, baseX, baseY)
    const d00 = corner.data!
    const o00 = corner.offset
    locate(x0 + 1, y0, base, baseX, baseY)
    const d10 = corner.data!
    const o10 = corner.offset
    locate(x0, y0 + 1, base, baseX, baseY)
    const d01 = corner.data!
    const o01 = corner.offset
    locate(x0 + 1, y0 + 1, base, baseX, baseY)
    const d11 = corner.data!
    const o11 = corner.offset
    const w00 = (1 - wx) * (1 - wy)
    const w10 = wx * (1 - wy)
    const w01 = (1 - wx) * wy
    const w11 = wx * wy
    out[o] = d00[o00]! * w00 + d10[o10]! * w10 + d01[o01]! * w01 + d11[o11]! * w11
    out[o + 1] = d00[o00 + 1]! * w00 + d10[o10 + 1]! * w10 + d01[o01 + 1]! * w01 + d11[o11 + 1]! * w11
    out[o + 2] = d00[o00 + 2]! * w00 + d10[o10 + 2]! * w10 + d01[o01 + 2]! * w01 + d11[o11 + 2]! * w11
    out[o + 3] = 255
    return true
  }
}

// Visits each pixel of an extent of the image that the projection draws on the globe, with its position in the tile grid of a zoom: the inverse is interpolated in each cell of a grid, and computed pixel by pixel in a cell over the edge of the globe, the antimeridian or the border between two insets. Yields after each row of cells
export function* tilePositions(
  projection: InvertibleProjection,
  [[x0, y0], [x1, y1]]: Extent,
  { zoom, pixelRatio, tileSize }: { zoom: number, pixelRatio: number, tileSize: number },
  visit: (px: number, py: number, fx: number, fy: number) => void,
): Generator<void, void> {
  const n = 2 ** zoom
  const exactAt = (px: number, py: number): TilePoint | null => {
    const inverse = invertOnGlobe(projection, [(px + 0.5) / pixelRatio, (py + 0.5) / pixelRatio])
    return inverse && tileOf(inverse, zoom)
  }
  const left = Math.floor(x0 * pixelRatio)
  const top = Math.floor(y0 * pixelRatio)
  const right = Math.ceil(x1 * pixelRatio)
  const bottom = Math.ceil(y1 * pixelRatio)
  if (right <= left || bottom <= top) {
    return
  }
  const columns = Math.max(1, Math.ceil((right - 1 - left) / GRID_STEP))
  const nodeX = (i: number) => Math.min(left + i * GRID_STEP, right - 1)
  let upper = Array.from({ length: columns + 1 }, (_, i) => exactAt(nodeX(i), top))
  for (let cy0 = top; cy0 < bottom; cy0 += GRID_STEP) {
    const cy1 = Math.min(cy0 + GRID_STEP, bottom - 1)
    const lower = Array.from({ length: columns + 1 }, (_, i) => exactAt(nodeX(i), cy1))
    const rowEnd = cy0 + GRID_STEP >= bottom ? bottom : cy0 + GRID_STEP
    for (let i = 0; i < columns; i++) {
      const cx0 = nodeX(i)
      const cx1 = nodeX(i + 1)
      const a = upper[i]
      const b = upper[i + 1]
      const c = lower[i]
      const d = lower[i + 1]
      const width = cx1 - cx0
      const height = cy1 - cy0
      let smooth = a !== null && b !== null && c !== null && d !== null
        && Math.max(a[0], b[0], c[0], d[0]) - Math.min(a[0], b[0], c[0], d[0]) < n / 2
      if (smooth) {
        const cx = Math.round((cx0 + cx1) / 2)
        const cy = Math.round((cy0 + cy1) / 2)
        const u = width > 0 ? (cx - cx0) / width : 0
        const v = height > 0 ? (cy - cy0) / height : 0
        const exact = exactAt(cx, cy)
        smooth = exact !== null
          && Math.abs(exact[0] - ((a![0] * (1 - u) + b![0] * u) * (1 - v) + (c![0] * (1 - u) + d![0] * u) * v)) * tileSize <= GRID_TOLERANCE
          && Math.abs(exact[1] - ((a![1] * (1 - u) + b![1] * u) * (1 - v) + (c![1] * (1 - u) + d![1] * u) * v)) * tileSize <= GRID_TOLERANCE
      }
      const columnEnd = i === columns - 1 ? right : cx1
      for (let py = cy0; py < rowEnd; py++) {
        const v = height > 0 ? (py - cy0) / height : 0
        for (let px = cx0; px < columnEnd; px++) {
          if (smooth) {
            const u = width > 0 ? (px - cx0) / width : 0
            visit(px, py, (a![0] * (1 - u) + b![0] * u) * (1 - v) + (c![0] * (1 - u) + d![0] * u) * v, (a![1] * (1 - u) + b![1] * u) * (1 - v) + (c![1] * (1 - u) + d![1] * u) * v)
          }
          else {
            const exact = exactAt(px, py)
            if (exact) {
              visit(px, py, exact[0], exact[1])
            }
          }
        }
      }
    }
    upper = lower
    yield
  }
}
