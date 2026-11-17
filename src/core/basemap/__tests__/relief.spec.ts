import { describe, expect, it } from 'vitest'
import { reliefExaggeration, shadeTile, terrariumElevations } from '@/core/basemap'

const SIZE = 4
const options = { n: 4, zoom: 2, tileSize: SIZE }

const tile = (altitude: (column: number, row: number) => number) => Float32Array.from({ length: SIZE * SIZE }, (_, i) => altitude(i % SIZE, Math.floor(i / SIZE)))
const rgb = (pixels: Uint8ClampedArray, column: number, row: number) => [...pixels.slice((row * SIZE + column) * 4, (row * SIZE + column) * 4 + 3)]
const shaded = (tiles: Record<string, Float32Array | null>, x = 1, y = 1) => shadeTile(new Map(Object.entries(tiles)), x, y, options)

describe('terrariumElevations', () => {
  it('reads R × 256 + G + B / 256 − 32768 meters in each pixel', () => {
    const pixels = [128, 0, 0, 255, 162, 144, 0, 255, 127, 156, 0, 255]
    expect([...terrariumElevations(pixels, 4)]).toEqual([0, 8848, -100])
  })
})

describe('shadeTile', () => {
  it('gives a flat tile one tint, which depends on its altitude', () => {
    const low = shaded({ '1,1': tile(() => 100) })!.pixels
    const high = shaded({ '1,1': tile(() => 1500) })!.pixels
    expect(new Set([...Array.from({ length: SIZE * SIZE }).keys()].map(i => rgb(low, i % SIZE, Math.floor(i / SIZE)).join()))).toHaveLength(1)
    expect(rgb(low, 0, 0)).not.toEqual(rgb(high, 0, 0))
  })

  it('lights a slope that faces the north-west more than a slope that faces the south-east', () => {
    const facingNorthWest = shaded({ '1,1': tile((column, row) => 1000 + 300 * (column + row)) })!.pixels
    const facingSouthEast = shaded({ '1,1': tile((column, row) => 1000 - 300 * (column + row)) })!.pixels
    expect(rgb(facingNorthWest, 1, 1)[0]!).toBeGreaterThan(rgb(facingSouthEast, 1, 1)[0]!)
  })

  // Above 3500 meters the tint is constant: the color of a pixel of a ramp depends on its slope only
  it('draws the edge shared with the eastern neighbor like the inside of a ramp', () => {
    const ramp = (offset: number) => tile(column => 9000 - 300 * (column + offset))
    const pixels = shaded({ '1,1': ramp(0), '2,1': ramp(SIZE) })!.pixels
    expect(rgb(pixels, SIZE - 1, 1)).toEqual(rgb(pixels, 1, 1))
  })

  it('reads the western neighbor across the antimeridian', () => {
    const ramp = (offset: number) => tile(column => 9000 - 300 * (column + offset))
    const pixels = shaded({ '3,1': ramp(-SIZE), '0,1': ramp(0) }, 0)!.pixels
    expect(rgb(pixels, 0, 1)).toEqual(rgb(pixels, 1, 1))
  })

  it('gives the sea one color at or below 0 meters, whatever the slope', () => {
    const pixels = shaded({ '1,1': tile((column, row) => -50 * (column + row)) })!.pixels
    expect(rgb(pixels, 1, 1)).toEqual(rgb(pixels, 3, 3))
    expect(rgb(pixels, 0, 0)).toEqual(rgb(pixels, 2, 2))
  })

  it('shades a tile whose neighbors are missing, and tells it is incomplete', () => {
    const alone = shaded({ '1,1': tile(() => 500) })
    const surrounded = shaded(Object.fromEntries([0, 1, 2].flatMap(x => [0, 1, 2].map(y => [`${x},${y}`, tile(() => 500)]))))
    expect(alone?.complete).toBe(false)
    expect(surrounded?.complete).toBe(true)
    expect(shaded({ '1,1': null })).toBeNull()
  })

  it('counts a tile on a pole edge as complete without the tiles beyond the pole', () => {
    const row = Object.fromEntries([0, 1, 2, 3].flatMap(x => [0, 1].map(y => [`${x},${y}`, tile(() => 500)])))
    expect(shaded(row, 1, 0)?.complete).toBe(true)
  })
})

describe('reliefExaggeration', () => {
  it('is 1 from the zoom 12 and grows toward the lower zooms', () => {
    expect(reliefExaggeration(12)).toBe(1)
    expect(reliefExaggeration(6)).toBe(8)
    expect(reliefExaggeration(4)).toBeGreaterThan(reliefExaggeration(8))
  })
})
