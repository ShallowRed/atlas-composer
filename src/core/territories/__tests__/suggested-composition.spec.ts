import type { GeoBoundsArray, SuggestedTerritory } from '../suggested-composition'
import { describe, expect, it } from 'vitest'
import { projectionRegistry } from '@/core/projections/registry'
import { createTerritoryCode } from '@/types/branded'
import { proposeComposition, suggestProjection } from '../suggested-composition'

const MAINLAND: GeoBoundsArray = [[-6.5, 41], [10, 51]]
const GUADELOUPE: GeoBoundsArray = [[-61.81, 15.83], [-61, 16.52]]
const REUNION: GeoBoundsArray = [[55.22, -21.39], [55.84, -20.87]]
const CHILE: GeoBoundsArray = [[-75.8, -56], [-66.4, -17.5]]
const SVALBARD: GeoBoundsArray = [[10, 76], [34, 81]]

const canvas = { width: 960, height: 500 }

function territory(code: string, bounds: GeoBoundsArray): SuggestedTerritory {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  return { code: createTerritoryCode(code), bounds, center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2] }
}

const territories = [
  territory('FR-GP', GUADELOUPE),
  territory('FR-MET', MAINLAND),
  territory('FR-RE', REUNION),
]

describe('suggestProjection', () => {
  it('suggests a conformal conic with parallels inside the latitudes of a mid-latitude territory', () => {
    const suggestion = suggestProjection(MAINLAND)
    expect(suggestion.projectionId).toBe('conic-conformal')
    expect(suggestion.reason).toBe('eastWest')
    const [south, north] = suggestion.parameters.parallels!
    expect(south).toBeGreaterThan(41)
    expect(north).toBeLessThan(51)
  })

  it('suggests the transverse Mercator for a territory elongated north-south', () => {
    expect(suggestProjection(CHILE)).toMatchObject({ projectionId: 'transverse-mercator', reason: 'northSouth' })
  })

  it('suggests the Mercator near the equator', () => {
    expect(suggestProjection(GUADELOUPE)).toMatchObject({ projectionId: 'mercator', reason: 'equatorial' })
  })

  it('suggests an azimuthal equal-area projection for a polar territory', () => {
    expect(suggestProjection(SVALBARD)).toMatchObject({ projectionId: 'azimuthal-equal-area', reason: 'polar' })
  })

  it('returns ids of the projection registry', () => {
    for (const bounds of [MAINLAND, CHILE, GUADELOUPE, SVALBARD]) {
      expect(projectionRegistry.get(suggestProjection(bounds).projectionId)).toBeDefined()
    }
  })
})

// Projects the corners of the bounds as CompositeProjection places a sub-projection
function placedCorners(state: ReturnType<typeof proposeComposition>, code: string, bounds: GeoBoundsArray) {
  const parameters = state.territoryParameters[createTerritoryCode(code)]!
  const projection = projectionRegistry.get(parameters.projectionId!)!.create()
  projection.center(parameters.center ?? [0, 0]).rotate(parameters.rotate ?? [0, 0, 0])
  if (parameters.parallels) {
    (projection as any).parallels(parameters.parallels)
  }
  const [dx, dy] = parameters.translateOffset!
  const translate: [number, number] = [canvas.width / 2 + dx, canvas.height / 2 + dy]
  projection.scale(state.canvas!.referenceScale * parameters.scaleMultiplier!).translate(translate)
  const [x0, y0, x1, y1] = parameters.pixelClipExtent!
  const clip = [translate[0] + x0, translate[1] + y0, translate[0] + x1, translate[1] + y1]
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const corners = [[minLon, minLat], [minLon, maxLat], [maxLon, minLat], [maxLon, maxLat]].map(point => projection(point as [number, number])!)
  return { corners, clip }
}

describe('proposeComposition', () => {
  it('puts the largest territory first, in the main zone', () => {
    const state = proposeComposition({ territories, canvas, arrangement: 'insets-right', scaleMode: 'readable' })
    expect(state.activeTerritories[0]).toBe('FR-MET')
    expect(state.activeTerritories).toHaveLength(3)
  })

  it.each(['insets-right', 'insets-bottom'] as const)('keeps each territory inside its frame on the canvas (%s)', (arrangement) => {
    const state = proposeComposition({ territories, canvas, arrangement, scaleMode: 'readable' })
    const frames = [['FR-MET', MAINLAND], ['FR-GP', GUADELOUPE], ['FR-RE', REUNION]] as const
    for (const [code, bounds] of frames) {
      const { corners, clip } = placedCorners(state, code, bounds)
      expect(clip[0]).toBeGreaterThanOrEqual(-0.01)
      expect(clip[1]).toBeGreaterThanOrEqual(-0.01)
      expect(clip[2]).toBeLessThanOrEqual(canvas.width + 0.01)
      expect(clip[3]).toBeLessThanOrEqual(canvas.height + 0.01)
      for (const [x, y] of corners) {
        expect(x).toBeGreaterThanOrEqual(clip[0]! - 0.5)
        expect(x).toBeLessThanOrEqual(clip[2]! + 0.5)
        expect(y).toBeGreaterThanOrEqual(clip[1]! - 0.5)
        expect(y).toBeLessThanOrEqual(clip[3]! + 0.5)
      }
    }
  })

  it('places the insets along the chosen edge', () => {
    const right = proposeComposition({ territories, canvas, arrangement: 'insets-right', scaleMode: 'readable' })
    const bottom = proposeComposition({ territories, canvas, arrangement: 'insets-bottom', scaleMode: 'readable' })
    const gp = createTerritoryCode('FR-GP')
    expect(right.territoryParameters[gp]!.translateOffset![0]).toBeGreaterThan(300)
    expect(bottom.territoryParameters[gp]!.translateOffset![1]).toBeGreaterThan(100)
  })

  it('gives every territory the same scale in the uniform mode, and enlarges the small ones in the readable mode', () => {
    const uniform = proposeComposition({ territories, canvas, arrangement: 'insets-right', scaleMode: 'uniform' })
    const readable = proposeComposition({ territories, canvas, arrangement: 'insets-right', scaleMode: 'readable' })
    const multipliers = Object.values(uniform.territoryParameters).map(({ scaleMultiplier }) => scaleMultiplier)
    expect(new Set(multipliers).size).toBe(1)

    const met = createTerritoryCode('FR-MET')
    const gp = createTerritoryCode('FR-GP')
    expect(readable.territoryParameters[met]!.scaleMultiplier).toBe(1)
    expect(readable.territoryParameters[gp]!.scaleMultiplier).toBeGreaterThan(2)
  })

  it('fills the canvas with a single territory', () => {
    const state = proposeComposition({ territories: [territory('CL-CONT', CHILE)], canvas, arrangement: 'insets-right', scaleMode: 'readable' })
    const parameters = state.territoryParameters[createTerritoryCode('CL-CONT')]!
    expect(parameters.projectionId).toBe('transverse-mercator')
    expect(parameters.pixelClipExtent![3]! - parameters.pixelClipExtent![1]!).toBeCloseTo(canvas.height, 0)
  })
})
