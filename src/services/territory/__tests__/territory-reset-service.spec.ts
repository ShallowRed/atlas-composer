import type { PresetDefaults, PresetParameters, TerritoryConfig } from '../types'
import { describe, expect, it } from 'vitest'
import { createTerritoryCode } from '@/types/branded'
import { TerritoryResetService } from '../territory-reset-service'

describe('territoryResetService', () => {
  const mockTerritories: TerritoryConfig[] = [
    { code: createTerritoryCode('FR-MET'), name: 'France Métropolitaine' },
    { code: createTerritoryCode('FR-GP'), name: 'Guadeloupe' },
    { code: createTerritoryCode('FR-MQ'), name: 'Martinique' },
  ]

  const mockPresetDefaults: PresetDefaults = {
    projections: {
      'FR-GP': 'mercator' as any,
      'FR-MQ': 'azimuthal-equal-area' as any,
    },
    translations: {
      'FR-GP': { x: 100, y: 50 },
      'FR-MQ': { x: 200, y: 100 },
    },
    scales: {
      'FR-GP': 1.5,
      'FR-MQ': 2.0,
    },
  }

  const mockPresetParameters: PresetParameters = {
    'FR-GP': { rotate: [10, 20, 0] },
  }

  describe('calculateBulkReset', () => {
    it('should use preset strategy when preset defaults are available', () => {
      const result = TerritoryResetService.calculateBulkReset({
        territories: mockTerritories,
        presetDefaults: mockPresetDefaults,
        presetParameters: mockPresetParameters,
      })

      expect(result.operations).toHaveLength(2) // Only territories in preset
      expect(result.activeTerritories).toEqual(['FR-GP', 'FR-MQ'])

      // Check first operation
      const gpOperation = result.operations.find(op => op.territoryCode === 'FR-GP')
      expect(gpOperation).toEqual({
        territoryCode: 'FR-GP',
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

      expect(result.operations).toHaveLength(3) // All territories
      expect(result.activeTerritories).toBeUndefined() // Don't change active territories

      // Check operations use fallback defaults
      result.operations.forEach((op) => {
        expect(op.translation).toEqual({ x: 0, y: 0 })
        expect(op.scale).toBe(1.0)
        expect(op.projection).toBeUndefined()
        expect(op.shouldClearOverrides).toBe(true)
      })
    })

    it('should use fallback when preset defaults is empty', () => {
      const emptyPreset: PresetDefaults = {
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
      const partialPreset: PresetDefaults = {
        projections: {
          'FR-GP': 'mercator' as any,
        },
        translations: {
          // FR-GP translation missing
        },
        scales: {
          'FR-GP': 1.5,
        },
      }

      const result = TerritoryResetService.calculateBulkReset({
        territories: mockTerritories,
        presetDefaults: partialPreset,
      })

      const gpOperation = result.operations.find(op => op.territoryCode === 'FR-GP')
      expect(gpOperation?.translation).toEqual({ x: 0, y: 0 }) // Default when missing
    })

    it('should handle missing scale with default value', () => {
      const partialPreset: PresetDefaults = {
        projections: {
          'FR-GP': 'mercator' as any,
        },
        translations: {
          'FR-GP': { x: 100, y: 50 },
        },
        scales: {
          // FR-GP scale missing
        },
      }

      const result = TerritoryResetService.calculateBulkReset({
        territories: mockTerritories,
        presetDefaults: partialPreset,
      })

      const gpOperation = result.operations.find(op => op.territoryCode === 'FR-GP')
      expect(gpOperation?.scale).toBe(1.0) // Default when missing
    })
  })

  describe('calculateTerritoryReset', () => {
    it('should use preset values when available for territory', () => {
      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: 'FR-GP',
        presetDefaults: mockPresetDefaults,
        presetParameters: mockPresetParameters,
      })

      expect(result).toEqual({
        territoryCode: 'FR-GP',
        projection: 'mercator',
        translation: { x: 100, y: 50 },
        scale: 1.5,
        parameters: { rotate: [10, 20, 0] },
        shouldClearOverrides: true,
      })
    })

    it('should use fallback when territory not in preset', () => {
      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: 'FR-MET', // Not in preset
        presetDefaults: mockPresetDefaults,
      })

      expect(result).toEqual({
        territoryCode: 'FR-MET',
        translation: { x: 0, y: 0 },
        scale: 1.0,
        shouldClearOverrides: true,
      })
    })

    it('should use fallback when no preset provided', () => {
      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: 'FR-GP',
      })

      expect(result).toEqual({
        territoryCode: 'FR-GP',
        translation: { x: 0, y: 0 },
        scale: 1.0,
        shouldClearOverrides: true,
      })
    })

    it('should handle missing translation in preset', () => {
      const partialPreset: PresetDefaults = {
        projections: {
          'FR-GP': 'mercator' as any,
        },
        translations: {},
        scales: {
          'FR-GP': 1.5,
        },
      }

      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: 'FR-GP',
        presetDefaults: partialPreset,
      })

      expect(result.translation).toEqual({ x: 0, y: 0 })
      expect(result.scale).toBe(1.5)
    })

    it('should handle missing scale in preset', () => {
      const partialPreset: PresetDefaults = {
        projections: {
          'FR-GP': 'mercator' as any,
        },
        translations: {
          'FR-GP': { x: 100, y: 50 },
        },
        scales: {},
      }

      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: 'FR-GP',
        presetDefaults: partialPreset,
      })

      expect(result.translation).toEqual({ x: 100, y: 50 })
      expect(result.scale).toBe(1.0)
    })

    it('should not include parameters when not provided', () => {
      const result = TerritoryResetService.calculateTerritoryReset({
        territoryCode: 'FR-GP',
        presetDefaults: mockPresetDefaults,
        // No preset parameters
      })

      expect(result.parameters).toBeUndefined()
    })
  })

  describe('getDefaultTranslation', () => {
    it('should return default translation', () => {
      const result = TerritoryResetService.getDefaultTranslation()
      expect(result).toEqual({ x: 0, y: 0 })
    })
  })

  describe('getDefaultScale', () => {
    it('should return default scale', () => {
      const result = TerritoryResetService.getDefaultScale()
      expect(result).toBe(1.0)
    })
  })
})
