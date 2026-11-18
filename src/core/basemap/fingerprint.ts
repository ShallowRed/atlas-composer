import type { BasemapSource } from './sources'
import type { Extent, InvertibleProjection } from '@/core/frames'
import { invertOnGlobe } from '@/core/frames'

interface FingerprintFrame {
  projection: InvertibleProjection
  extent: Extent
}

interface FingerprintOptions {
  width: number
  height: number
  pixelRatio: number
}

// Points of the grid along each side of a frame, corners included
const GRID_SIZE = 5

const round = (value: number, digits: number) => Number(value.toFixed(digits))

// The position on the globe of a grid of points of each frame, in the order of the render: a frame drawn later covers the frames under it
function describeFrame({ projection, extent: [[x0, y0], [x1, y1]] }: FingerprintFrame): string {
  const fractions = Array.from({ length: GRID_SIZE }, (_, index) => index / (GRID_SIZE - 1))
  const points = fractions.flatMap(fx => fractions.map((fy) => {
    const inverse = invertOnGlobe(projection, [x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy])
    return inverse ? `${round(inverse[0], 7)},${round(inverse[1], 7)}` : '-'
  }))
  return `${[x0, y0, x1, y1].map(value => round(value, 3)).join(',')};${points.join(';')}`
}

// cyrb53, a 53-bit string hash: two different descriptions give the same hash with a negligible chance
function hash(text: string): string {
  let h1 = 0xDEADBEEF
  let h2 = 0x41C6CE57
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

// What the image of a raster basemap depends on, besides the code that draws it: a number near a rounding limit may change the fingerprint, which only costs a render
export function basemapFingerprint(source: Exclude<BasemapSource, 'none'>, frames: FingerprintFrame[], { width, height, pixelRatio }: FingerprintOptions): string {
  return `${source}-${hash([width, height, pixelRatio, ...frames.map(describeFrame)].join('|'))}`
}
