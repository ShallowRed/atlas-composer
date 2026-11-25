import type { ProposedTerritory } from '../proposal'
import { describe, expect, it } from 'vitest'
import { parallelsForBand } from '@/core/parameters'
import { PROPOSED_PROJECTION_IDS } from '@/core/projections/defaults'
import { projectionRegistry } from '@/core/projections/registry'
import { createTerritoryCode } from '@/types/branded'
import { arrangeZones, freeCell, proposeComposition, suggestProjection } from '../proposal'

const canvas = { width: 960, height: 500 }

// A clockwise ring of d3, west, north, east, then south
function box(west: number, south: number, east: number, north: number): GeoJSON.Polygon {
  return { type: 'Polygon', coordinates: [[[west, south], [west, north], [east, north], [east, south], [west, south]]] }
}

function territory(code: string, west: number, south: number, east: number, north: number): ProposedTerritory {
  return { code: createTerritoryCode(code), geometry: box(west, south, east, north), center: [(west + east) / 2, (south + north) / 2], band: [south, north] }
}

const MAIN = territory('MAIN', -5, 42, 12, 51)
const ISLAND = territory('ISLAND', -61.8, 15.8, -61, 16.5)
const SOUTH = territory('SOUTH', 55.2, -21.4, 55.9, -20.8)

describe('suggestProjection', () => {
  it.each([
    ['polar beyond 60° of mean latitude', box(-46, 60.5, -44, 61.5), 'polar'],
    ['not polar at 60° of mean latitude', box(-46, 59.4, -44, 60.4), 'midLatitude'],
    ['north-south from 8° of latitude 1.6 times the east-west extent', box(-71, 36, -69.5, 44), 'northSouth'],
    ['not north-south under 8° of latitude', box(-71, 36, -70, 43.9), 'midLatitude'],
    ['north-south at 1.65 times the east-west extent', box(-71, 36, -62.9, 46), 'northSouth'],
    ['not north-south at 1.55 times the east-west extent', box(-71, 36, -62.4, 46), 'midLatitude'],
    ['equatorial under 25° of mean latitude', box(-62, 23, -60, 26.9), 'equatorial'],
    ['a conic from 25° of mean latitude', box(-62, 24, -60, 26.1), 'midLatitude'],
    ['east-west when wider than high', box(-10, 40, 10, 45), 'eastWest'],
  ])('is %s', (_, geometry, reason) => {
    expect(suggestProjection(geometry)).toEqual({ projectionId: PROPOSED_PROJECTION_IDS[reason as keyof typeof PROPOSED_PROJECTION_IDS], reason })
  })

  it('reads the east-west extent of a geometry across the antimeridian', () => {
    expect(suggestProjection(box(175, 50, -175, 54)).reason).toBe('eastWest')
  })

  it.each(Object.entries(PROPOSED_PROJECTION_IDS))('gives %s a projection of the registry', (_, projectionId) => {
    expect(projectionRegistry.get(projectionId)).toBeDefined()
  })
})

describe('proposeComposition', () => {
  const options = { arrangement: 'insets-right', scaleMode: 'readable', canvas } as const

  it('gives a conic the parallels of the band of its territory', () => {
    const { state } = proposeComposition([MAIN], options)

    expect(state.territoryParameters[MAIN.code]).toMatchObject({ projectionId: 'conic-conformal', parallels: parallelsForBand(MAIN.band) })
  })

  it('gives the same state whatever the order of the checked territories', () => {
    expect(proposeComposition([SOUTH, MAIN, ISLAND], options)).toEqual(proposeComposition([ISLAND, SOUTH, MAIN], options))
  })

  it('puts the territory of largest area first, then the others by area', () => {
    expect(proposeComposition([ISLAND, SOUTH, MAIN], options).state.activeTerritories).toEqual([MAIN.code, ISLAND.code, SOUTH.code])
  })

  it('gives each reason of projection', () => {
    expect(proposeComposition([ISLAND, MAIN], options).reasons).toEqual({ [MAIN.code]: 'eastWest', [ISLAND.code]: 'equatorial' })
  })

  it('keeps the main territory at the reference scale and fits each other one to its cell in the readable scale', () => {
    const { territoryParameters } = proposeComposition([MAIN, ISLAND, SOUTH], options).state

    expect(territoryParameters[MAIN.code]!.scaleMultiplier).toBe(1)
    expect(territoryParameters[ISLAND.code]!.scaleMultiplier).toBeGreaterThan(1)
  })

  it('gives every territory the same scale in the uniform scale', () => {
    const { territoryParameters } = proposeComposition([MAIN, ISLAND, SOUTH], { ...options, scaleMode: 'uniform' }).state

    expect(Object.values(territoryParameters).map(({ scaleMultiplier }) => scaleMultiplier)).toEqual([1, 1, 1])
  })
})

describe('arrangeZones', () => {
  it('puts the insets in a column along the right edge', () => {
    const { main, insets } = arrangeZones(3, canvas, 'insets-right')

    expect(insets.every(zone => zone.left > main.right && zone.right <= canvas.width)).toBe(true)
  })

  it('puts the insets in a row along the bottom edge', () => {
    const { main, insets } = arrangeZones(3, canvas, 'insets-bottom')

    expect(insets.every(zone => zone.top > main.bottom && zone.bottom <= canvas.height)).toBe(true)
  })

  it('gives the whole canvas to a single territory', () => {
    expect(arrangeZones(0, canvas, 'insets-right')).toEqual({ main: { left: 0, top: 0, right: 960, bottom: 500 }, insets: [] })
  })
})

describe('freeCell', () => {
  const right = { arrangement: 'insets-right', canvas } as const

  it('takes the top cell of the right column on an empty canvas, on the grid of the insets of the proposal', () => {
    expect(freeCell([], 3, right)).toEqual(arrangeZones(2, canvas, 'insets-right').insets[0])
  })

  it('goes down the right column, then to the column on its left', () => {
    expect(freeCell([{ left: 810, top: 100, right: 960, bottom: 240 }], 3, right).top).toBe(250)
    expect(freeCell([{ left: 810, top: 0, right: 960, bottom: 500 }], 3, right)).toEqual({ left: 660, top: 100, right: 802, bottom: 242 })
  })

  it('goes along the bottom row from the left, then to the row above it', () => {
    const bottom = { arrangement: 'insets-bottom', canvas } as const

    expect(freeCell([], 3, bottom)).toEqual({ left: 34, top: 350, right: 176, bottom: 492 })
    expect(freeCell([{ left: 0, top: 350, right: 960, bottom: 500 }], 3, bottom).top).toBe(200)
  })

  it('takes the first cell when every cell is occupied', () => {
    expect(freeCell([{ left: 0, top: 0, right: 960, bottom: 500 }], 3, right)).toEqual(freeCell([], 3, right))
  })
})
