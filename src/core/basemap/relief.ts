type Rgb = [number, number, number]

const EARTH_CIRCUMFERENCE = 40075016.686
// The light comes from the north-west, 45° above the horizon
const ZENITH = Math.PI / 4
const AZIMUTH = (360 - 315 + 90) * Math.PI / 180
const COS_ZENITH = Math.cos(ZENITH)
const SIN_ZENITH = Math.sin(ZENITH)
const COS_AZIMUTH = Math.cos(AZIMUTH)
const SIN_AZIMUTH = Math.sin(AZIMUTH)
const SHADE_CONTRAST = 0.9
const SEA: Rgb = [0xC4, 0xD9, 0xE3]
const TINTS: Array<[number, Rgb]> = [
  [0, [0xA8, 0xC4, 0x96]],
  [300, [0xC8, 0xD2, 0x9E]],
  [1000, [0xDC, 0xCF, 0xA6]],
  [2000, [0xC9, 0xB4, 0x9A]],
  [3500, [0xF2, 0xF2, 0xF0]],
]
const NEIGHBORS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const
const TINT_STEP = 10

// The altitude in meters of each pixel of a Terrarium tile, from the bytes of its decoded PNG
export function terrariumElevations(pixels: ArrayLike<number>, channels: number): Float32Array {
  const elevations = new Float32Array(pixels.length / channels)
  for (let i = 0; i < elevations.length; i++) {
    const o = i * channels
    elevations[i] = pixels[o]! * 256 + pixels[o + 1]! + pixels[o + 2]! / 256 - 32768
  }
  return elevations
}

// The factor of the slopes: the pixel of a lower zoom averages the slopes of a larger area, which flattens the relief
export function reliefExaggeration(zoom: number): number {
  return 2 ** (Math.max(0, 12 - zoom) / 2)
}

function tint(elevation: number): Rgb {
  const upper = TINTS.findIndex(([stop]) => stop >= elevation)
  if (upper === -1) {
    return TINTS.at(-1)![1]
  }
  const [stop0, rgb0] = TINTS[Math.max(0, upper - 1)]!
  const [stop1, rgb1] = TINTS[upper]!
  const t = stop1 === stop0 ? 0 : (elevation - stop0) / (stop1 - stop0)
  return [rgb0[0] + (rgb1[0] - rgb0[0]) * t, rgb0[1] + (rgb1[1] - rgb0[1]) * t, rgb0[2] + (rgb1[2] - rgb0[2]) * t]
}

// The tints of the land by step of 10 meters, from 0 to the last stop
const TINT_TABLE = Float32Array.from({ length: (TINTS.at(-1)![0] / TINT_STEP + 1) * 3 }, (_, i) => tint(Math.floor(i / 3) * TINT_STEP)[i % 3]!)

// The altitudes of a tile with a border of one pixel read in its neighbors, across the antimeridian; a neighbor that is missing or beyond a pole repeats the edge pixel of the tile
function padded(elevations: Map<string, Float32Array | null>, x: number, y: number, n: number, size: number) {
  const own = elevations.get(`${x},${y}`)!
  const width = size + 2
  const grid = new Float32Array(width * width)
  let complete = true
  const neighbor = (dx: number, dy: number) => {
    if (y + dy < 0 || y + dy >= n) {
      return null
    }
    const tile = elevations.get(`${(((x + dx) % n) + n) % n},${y + dy}`) ?? null
    complete &&= tile !== null
    return tile
  }
  const tiles = new Map(NEIGHBORS.map(([dx, dy]) => [`${dx},${dy}`, neighbor(dx, dy)]))
  for (let row = -1; row <= size; row++) {
    for (let column = -1; column <= size; column++) {
      const dx = column < 0 ? -1 : column >= size ? 1 : 0
      const dy = row < 0 ? -1 : row >= size ? 1 : 0
      const source = dx === 0 && dy === 0 ? own : tiles.get(`${dx},${dy}`)
      const value = source
        ? source[(row - dy * size) * size + (column - dx * size)]!
        : own[Math.min(size - 1, Math.max(0, row)) * size + Math.min(size - 1, Math.max(0, column))]!
      grid[(row + 1) * width + column + 1] = value
    }
  }
  return { grid, complete }
}

// Shades the tile x,y of a zoom by the method of Horn, with its neighbors at its edges, and tints it by altitude; complete tells whether each neighbor on the globe was present
export function shadeTile(elevations: Map<string, Float32Array | null>, x: number, y: number, { n, zoom, tileSize }: { n: number, zoom: number, tileSize: number }): { pixels: Uint8ClampedArray, complete: boolean } | null {
  if (!elevations.get(`${x},${y}`)) {
    return null
  }
  const { grid, complete } = padded(elevations, x, y, n, tileSize)
  const width = tileSize + 2
  const exaggeration = reliefExaggeration(zoom)
  const pixels = new Uint8ClampedArray(tileSize * tileSize * 4)
  const lastTint = TINT_TABLE.length / 3 - 1
  for (let row = 0; row < tileSize; row++) {
    const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y * tileSize + row + 0.5) / (n * tileSize))))
    // The slopes in meters per meter, multiplied by the exaggeration
    const scale = exaggeration / (8 * EARTH_CIRCUMFERENCE * Math.cos(latitude) / (n * tileSize))
    const above = row * width
    const middle = above + width
    const below = middle + width
    for (let column = 0; column < tileSize; column++) {
      const elevation = grid[middle + column + 1]!
      const o = (row * tileSize + column) * 4
      if (elevation <= 0) {
        pixels[o] = SEA[0]
        pixels[o + 1] = SEA[1]
        pixels[o + 2] = SEA[2]
        pixels[o + 3] = 255
        continue
      }
      const a = grid[above + column]!
      const b = grid[above + column + 1]!
      const c = grid[above + column + 2]!
      const d = grid[middle + column]!
      const f = grid[middle + column + 2]!
      const g = grid[below + column]!
      const h = grid[below + column + 1]!
      const i = grid[below + column + 2]!
      const p = ((c + 2 * f + i) - (a + 2 * d + g)) * scale
      const q = ((g + 2 * h + i) - (a + 2 * b + c)) * scale
      // Horn: cos(zenith) cos(slope) + sin(zenith) sin(slope) cos(azimuth − aspect), with the aspect atan2(q, −p)
      const hillshade = (COS_ZENITH + SIN_ZENITH * (SIN_AZIMUTH * q - COS_AZIMUTH * p)) / Math.sqrt(1 + p * p + q * q)
      const light = 1 + SHADE_CONTRAST * (Math.max(0, hillshade) - COS_ZENITH)
      const t = Math.min(lastTint, Math.round(elevation / TINT_STEP)) * 3
      pixels[o] = TINT_TABLE[t]! * light
      pixels[o + 1] = TINT_TABLE[t + 1]! * light
      pixels[o + 2] = TINT_TABLE[t + 2]! * light
      pixels[o + 3] = 255
    }
  }
  return { pixels, complete }
}
