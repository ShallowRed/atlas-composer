import type { PresetParameters } from '../types'
import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryConfig } from '@/types'
import { describe, expect, it } from 'vitest'
import { createTerritoryCode } from '@/types/branded'
import { TerritoryResetService } from '../territory-reset-service'

const MET = createTerritoryCode('FR-MET')
const GP = createTerritoryCode('FR-GP')
const MQ = createTerritoryCode('FR-MQ')

describe('territoryResetService', () => {
  const mockTerritories: Pick<TerritoryConfig, 'code' | 'name'>[] = [
    { code: MET, name: 'France Métropolitaine' },
    { code: GP, name: 'Guadeloupe' },
    { code: MQ, name: 'Martinique' },
  ]

  const mockTerritoryDefaults: TerritoryDefaults = {
    projections: {
      [GP]: 'mercator' as any,
      [MQ]: 'azimuthal-equal-area' as any,
    },
    translations: {
      [GP]: { x: 100, y: 50 },
      [MQ]: { x: 200, y: 100 },
    },
    scales: {
      [GP]: 1.5,
      [MQ]: 2.0,
    },
  }

  const mockPresetParameters: PresetParameters = {
    [GP]: { rotate: [10, 20, 0] },
  }

  describe('calculateBulkReset', () => {
    it('should use preset strategy when preset defaults are available', () => {
      const result = TerritoryResetService.calculateBulkReset({
        territories: mockTerritories,
        presetDefaults: mockTerritoryDefaults,
        presetParameters: mockPresetParameters,
      })

      expect(result.operations).toHaveLength(2)
      expect(result.activeTerritories).toEqual([GP, MQ])

      const gpOperation = result.operations.find(op => op.territoryCode === GP)
      expect(gpOperation).toEqual({
        territoryCode: GP,
        projection: 'mercator',
        translation: { x: 100, y: 50 },
        scale: 1.5,
        parameters: { rotate: [10, 20, 0] },
        shouldClearOverrides: true,
      })
    })

    it('should use fallback strategy when no preset defaults', () => {
      const result = TerritoryResetService.calculateBulkReset({
        territories: mockTerritories,
      })

      expect(result.operations).toHaveLength(3)
      expect(result.activeTerritories).toBeUndefined()

      result.operations.forEach((op) => {
        expect(op.translation).toEqual({ x: 0, y: 0 })
        expect(op.scale).toBe(1.0)
        expect(op.projection).toBeUndefined()
        expect(op.shouldClearOverrides).toBe(true)
      })
    })

    it('should use fallback when preset defaults is empty', () => {
      const emptyPreset: TerritoryDefaults = {
        projections: {},
        translations: {},
        scales: {},
      }

      const result = TerritoryResetService.calculateBulkReset({
        territories: mockTerritories,
        presetDefaults: emptyPreset,
      })

      expect(result.operations).toHaveLength(3)
      expect(result.activeTerritories).toBeUndefined()
    })

    it('should handle territories not in preset with default translation', () => {
      const partialPreset: TerritoryDefaults = {
        projections: {
          [GP]: 'mercator' as any,
        },
        translations: {
        },
        scales: {
          [GP]: 1.5,
        },
      }

      const result = TerritoryResetService.calculateBulkReset({
        territories: mockTerritories,
        presetDefaults: partialPreset,
      })

      const gpOperation = result.operations.find(op => op.territoryCode === GP)
      expect(gpOperation?.translation).toEqual({ x: 0, y: 0 })
    })

    it('should handle missing scale with default value', () => {
      const partialPreset: TerritoryDefaults = {
        projections: {
          [GP]: 'mercator' as any,
        },
        translations: {
          [GP]: { x: 100, y: 50 },
        },
        scales: {
        },
      }

      const result = TerritoryResetService.calculateBulkReset({
        territories: mockTerritories,
        presetDefaults: partialPreset,
      })

      const gpOperation = result.operations.find(op => op.territoryCode === GP)
      expect(gpOperation?.scale).toBe(1.0)
    })
  })

  describe('calculateTerritoryReset', () => {
    it('should use preset values when available for territory', () => {
      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: GP,
        presetDefaults: mockTerritoryDefaults,
        presetParameters: mockPresetParameters,
      })

      expect(result).toEqual({
        territoryCode: GP,
        projection: 'mercator',
        translation: { x: 100, y: 50 },
        scale: 1.5,
        parameters: { rotate: [10, 20, 0] },
        shouldClearOverrides: true,
      })
    })

    it('should use fallback when territory not in preset', () => {
      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: MET, // Not in preset
        presetDefaults: mockTerritoryDefaults,
      })

      expect(result).toEqual({
        territoryCode: MET,
        translation: { x: 0, y: 0 },
        scale: 1.0,
        shouldClearOverrides: true,
      })
    })

    it('should use fallback when no preset provided', () => {
      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: GP,
      })

      expect(result).toEqual({
        territoryCode: GP,
        translation: { x: 0, y: 0 },
        scale: 1.0,
        shouldClearOverrides: true,
      })
    })

    it('should handle missing translation in preset', () => {
      const partialPreset: TerritoryDefaults = {
        projections: {
          [GP]: 'mercator' as any,
        },
        translations: {},
        scales: {
          [GP]: 1.5,
        },
      }

      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: GP,
        presetDefaults: partialPreset,
      })

      expect(result.translation).toEqual({ x: 0, y: 0 })
      expect(result.scale).toBe(1.5)
    })

    it('should handle missing scale in preset', () => {
      const partialPreset: TerritoryDefaults = {
        projections: {
          [GP]: 'mercator' as any,
        },
        translations: {
          [GP]: { x: 100, y: 50 },
        },
        scales: {},
      }

      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: GP,
        presetDefaults: partialPreset,
      })

      expect(result.translation).toEqual({ x: 100, y: 50 })
      expect(result.scale).toBe(1.0)
    })

    it('should not include parameters when not provided', () => {
      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: GP,
        presetDefaults: mockTerritoryDefaults,
      })

      expect(result.parameters).toBeUndefined()
    })
  })
})
