import type { PresetParameters } from '../types'
import type { TerritoryConfig } from '@/types'
import { describe, expect, it } from 'vitest'
import { createTerritoryCode } from '@/types/branded'
import { referenceParameters, TerritoryResetService } from '../territory-reset-service'

const MET = createTerritoryCode('FR-MET')
const GP = createTerritoryCode('FR-GP')
const MQ = createTerritoryCode('FR-MQ')

const territories: Pick<TerritoryConfig, 'code'>[] = [{ code: MET }, { code: GP }, { code: MQ }]

const DEFAULT_LAYOUT = { translateOffset: [0, 0], scaleMultiplier: 1 }

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

describe('territoryResetService', () => {
  describe('calculateTerritoryReset', () => {
    it('gives the reference parameters of a territory of the preset', () => {
      expect(TerritoryResetService.calculateTerritoryReset({ territoryCode: GP, presetParameters }))
        .toEqual({ territoryCode: GP, parameters: presetParameters[GP] })
    })

    it('gives the default layout to a territory outside the preset', () => {
      expect(TerritoryResetService.calculateTerritoryReset({ territoryCode: MET, presetParameters }))
        .toEqual({ territoryCode: MET, parameters: DEFAULT_LAYOUT })
    })
  })

  describe('calculateBulkReset', () => {
    it('gives an operation to each territory of the preset, then to each other territory', () => {
      const { operations } = TerritoryResetService.calculateBulkReset({ territories, presetParameters })

      expect(operations).toEqual([
        { territoryCode: GP, parameters: presetParameters[GP] },
        { territoryCode: MQ, parameters: { projectionId: 'azimuthal-equal-area', ...DEFAULT_LAYOUT } },
        { territoryCode: MET, parameters: DEFAULT_LAYOUT },
      ])
    })

    it('gives the territories of the preset as active territories', () => {
      const { activeTerritories } = TerritoryResetService.calculateBulkReset({ territories, presetParameters })

      expect(activeTerritories).toEqual([GP, MQ])
    })

    it.each([
      ['without preset parameters', undefined],
      ['with empty preset parameters', {}],
    ])('gives the default layout to each territory and no active territories %s', (_case, emptyParameters) => {
      const { operations, activeTerritories } = TerritoryResetService.calculateBulkReset({ territories, presetParameters: emptyParameters })

      expect(operations).toEqual([MET, GP, MQ].map(territoryCode => ({ territoryCode, parameters: DEFAULT_LAYOUT })))
      expect(activeTerritories).toBeUndefined()
    })
  })
})
