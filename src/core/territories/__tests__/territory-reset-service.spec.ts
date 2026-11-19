import type { PresetParameters } from '../types'
import type { TerritoryConfig } from '@/types'
import { describe, expect, it } from 'vitest'
import { createTerritoryCode } from '@/types/branded'
import { defaultTerritoryParameters, referenceParameters, TerritoryResetService } from '../territory-reset-service'

const MET = createTerritoryCode('FR-MET')
const GP = createTerritoryCode('FR-GP')
const MQ = createTerritoryCode('FR-MQ')

const MET_CENTER: [number, number] = [2.5, 46.5]
const GP_CENTER: [number, number] = [-61.5, 16.2]
const MQ_CENTER: [number, number] = [-61, 14.6]

const territories: Pick<TerritoryConfig, 'code' | 'center'>[] = [
  { code: MET, center: MET_CENTER },
  { code: GP, center: GP_CENTER },
  { code: MQ, center: MQ_CENTER },
]

const DEFAULT_LAYOUT = { translateOffset: [0, 0], scaleMultiplier: 1 }

const territoryCenter = () => MET_CENTER

const presetParameters = {
  [GP]: { projectionId: 'mercator', translateOffset: [100, 50], scaleMultiplier: 1.5, rotate: [10, 20, 0] },
  [MQ]: { projectionId: 'azimuthal-equal-area' },
} satisfies PresetParameters

describe('referenceParameters', () => {
  it('gives the default layout without preset parameters', () => {
    expect(referenceParameters()).toEqual(DEFAULT_LAYOUT)
  })

  it('keeps the projection, the layout and the parameters of the preset', () => {
    expect(referenceParameters(presetParameters[GP])).toEqual(presetParameters[GP])
  })

  it('gives the default value to a layout key that the preset parameters omit', () => {
    expect(referenceParameters(presetParameters[MQ])).toEqual({ projectionId: 'azimuthal-equal-area', ...DEFAULT_LAYOUT })
  })
})

describe('defaultTerritoryParameters', () => {
  it('centers the fallback projection on the center of the territory, with the default layout', () => {
    expect(defaultTerritoryParameters(MET_CENTER)).toMatchObject({ projectionId: 'mercator', center: MET_CENTER, ...DEFAULT_LAYOUT })
  })
})

describe('territoryResetService', () => {
  describe('calculateTerritoryReset', () => {
    it('gives the reference parameters of a territory of the preset', () => {
      expect(TerritoryResetService.calculateTerritoryReset({ territoryCode: GP, presetParameters, territoryCenter }))
        .toEqual({ territoryCode: GP, parameters: presetParameters[GP] })
    })

    it('gives the default parameters to a territory outside the preset', () => {
      expect(TerritoryResetService.calculateTerritoryReset({ territoryCode: MET, presetParameters, territoryCenter }))
        .toEqual({ territoryCode: MET, parameters: defaultTerritoryParameters(MET_CENTER) })
    })
  })

  describe('calculateBulkReset', () => {
    it('gives an operation to each territory of the preset, then to each other territory', () => {
      const { operations } = TerritoryResetService.calculateBulkReset({ territories, presetParameters })

      expect(operations).toEqual([
        { territoryCode: GP, parameters: presetParameters[GP] },
        { territoryCode: MQ, parameters: { projectionId: 'azimuthal-equal-area', ...DEFAULT_LAYOUT } },
        { territoryCode: MET, parameters: defaultTerritoryParameters(MET_CENTER) },
      ])
    })

    it('gives the territories of the preset as active territories', () => {
      const { activeTerritories } = TerritoryResetService.calculateBulkReset({ territories, presetParameters })

      expect(activeTerritories).toEqual([GP, MQ])
    })

    it.each([
      ['without preset parameters', undefined],
      ['with empty preset parameters', {}],
    ])('gives the default parameters to each territory and no active territories %s', (_case, emptyParameters) => {
      const { operations, activeTerritories } = TerritoryResetService.calculateBulkReset({ territories, presetParameters: emptyParameters })

      expect(operations).toEqual(territories.map(({ code, center }) => ({ territoryCode: code, parameters: defaultTerritoryParameters(center) })))
      expect(activeTerritories).toBeUndefined()
    })
  })
})
