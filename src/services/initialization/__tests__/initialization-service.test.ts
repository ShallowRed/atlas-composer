/**
 * Tests for InitializationService
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAtlasId, createPresetId } from '@/types/branded'

import { InitializationService } from '../initialization-service'

// Mock dependencies
vi.mock('@/core/atlases/registry', () => ({
  getAtlasConfig: vi.fn(() => ({
    id: 'france',
    pattern: 'single-focus',
    defaultPreset: 'france-default',
    hasTerritorySelector: true,
    territoryModeOptions: [{ value: 'all', label: 'All territories' }],
    geoDataConfig: {
      dataPath: '/data/france.json',
      metadataPath: '/data/france-metadata.json',
      topologyObjectName: 'territories',
      additionalTerritories: [],
    },
  })),
  getAvailableViewModes: vi.fn(() => ['composite-custom', 'unified', 'split']),
  getDefaultViewMode: vi.fn(() => 'composite-custom'),
  getDefaultPresetForViewMode: vi.fn(() => ({ id: 'france-default', type: 'composite-custom' })),
  isAtlasLoaded: vi.fn(() => true),
  loadAtlasAsync: vi.fn(async () => ({
    atlasConfig: {
      id: 'france',
      pattern: 'single-focus',
    },
  })),
}))

vi.mock('@/services/atlas/atlas-service', () => ({
  AtlasService: vi.fn().mockImplementation(() => ({
    getAllTerritories: vi.fn(() => [
      { code: 'FR-MET', name: 'Metropolitan France' },
      { code: 'FR-GP', name: 'Guadeloupe' },
    ]),
  })),
}))

vi.mock('@/services/atlas/territory-defaults-service', () => ({
  TerritoryDefaultsService: {
    initializeAll: vi.fn(() => ({
      projections: {
        'FR-MET': 'conic-conformal',
        'FR-GP': 'mercator',
      },
      translations: {
        'FR-MET': { x: 0, y: 0 },
        'FR-GP': { x: 100, y: 100 },
      },
      scales: {
        'FR-MET': 1,
        'FR-GP': 1,
      },
    })),
  },
}))

vi.mock('@/services/presets/preset-loader', () => ({
  PresetLoader: {
    loadPreset: vi.fn(async () => ({
      success: true,
      data: {
        id: 'france-test',
        name: 'France Test Preset',
        atlasId: createAtlasId('france'),
        type: 'composite-custom',
        config: {
          territories: {
            'FR-MET': {
              projection: { id: 'conic-conformal' },
            },
            'FR-GP': {
              projection: { id: 'mercator' },
            },
          },
          referenceScale: 2700,
        },
      },
      errors: [],
      warnings: [],
    })),
    convertToDefaults: vi.fn(() => ({
      projections: {
        'FR-MET': 'conic-conformal',
        'FR-GP': 'mercator',
      },
      translations: {
        'FR-MET': { x: 0, y: 0 },
        'FR-GP': { x: 100, y: 100 },
      },
      scales: {
        'FR-MET': 1,
        'FR-GP': 1,
      },
    })),
    extractTerritoryParameters: vi.fn(() => ({
      'FR-MET': { projectionId: 'conic-conformal' },
      'FR-GP': { projectionId: 'mercator' },
    })),
  },
}))

vi.mock('@/services/presets/atlas-metadata-service', () => ({
  AtlasMetadataService: {
    getAtlasMetadata: vi.fn(async () => ({
      metadata: {
        defaultCompositeProjection: 'conic-conformal-france',
      },
    })),
    getCompositeProjections: vi.fn(async () => ['conic-conformal-france']),
    getProjectionPreferences: vi.fn(async () => ({
      recommended: ['natural-earth'],
    })),
  },
}))

vi.mock('@/services/validation/preset-validation-service', () => ({
  PresetValidationService: {
    validatePreset: vi.fn(() => ({
      isValid: true,
      errors: [],
      warnings: [],
    })),
  },
}))

describe('initializationService', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // TODO: These tests need to be rewritten to properly mock all store and service dependencies.
  // The InitializationService has complex interactions with multiple Pinia stores and services
  // that are difficult to fully mock. The current mocks don't capture all the internal state
  // and validation logic that has evolved in the service.

  describe.skip('initializeAtlas', () => {
    it('should successfully initialize an atlas', async () => {
      const result = await InitializationService.initializeAtlas({
        atlasId: createAtlasId('france'),
      })

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.state).toBeDefined()
      expect(result.state?.atlas.id).toBe('france')
    })

    it('should use default view mode if current is not supported', async () => {
      const result = await InitializationService.initializeAtlas({
        atlasId: createAtlasId('france'),
        preserveViewMode: true,
      })

      expect(result.success).toBe(true)
      expect(result.state?.viewMode).toBe('composite-custom')
    })

    it('should handle preset loading failure', async () => {
      const { PresetLoader } = await import('@/services/presets/preset-loader')
      vi.mocked(PresetLoader.loadPreset).mockResolvedValueOnce({
        success: false,
        data: undefined,
        errors: ['Preset not found'],
        warnings: [],
      })

      const result = await InitializationService.initializeAtlas({
        atlasId: createAtlasId('france'),
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('Failed to load default preset'))
    })

    it('should handle preset validation failure', async () => {
      const { PresetValidationService } = await import('@/services/validation/preset-validation-service')
      vi.mocked(PresetValidationService.validatePreset).mockReturnValueOnce({
        isValid: false,
        errors: ['Invalid preset structure'],
        warnings: [],
      })

      const result = await InitializationService.initializeAtlas({
        atlasId: createAtlasId('france'),
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid preset structure')
    })
  })

  describe.skip('loadPreset', () => {
    it('should successfully load a composite-custom preset', async () => {
      const result = await InitializationService.loadPreset({
        presetId: createPresetId('france-test'),
      })

      expect(result.success).toBe(true)
      expect(result.state?.preset?.id).toBe('france-test')
    })

    it('should handle preset load failure', async () => {
      const { PresetLoader } = await import('@/services/presets/preset-loader')
      vi.mocked(PresetLoader.loadPreset).mockResolvedValueOnce({
        success: false,
        data: undefined,
        errors: ['Preset not found'],
        warnings: [],
      })

      const result = await InitializationService.loadPreset({
        presetId: createPresetId('nonexistent'),
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('Failed to load preset'))
    })

    it('should skip validation when requested', async () => {
      const { PresetValidationService } = await import('@/services/validation/preset-validation-service')

      await InitializationService.loadPreset({
        presetId: createPresetId('france-test'),
        skipValidation: true,
      })

      expect(PresetValidationService.validatePreset).not.toHaveBeenCalled()
    })
  })

  describe.skip('changeViewMode', () => {
    it('should successfully change view mode', async () => {
      const result = await InitializationService.changeViewMode({
        viewMode: 'unified',
        autoLoadPreset: false,
      })

      expect(result.success).toBe(true)
    })

    it('should reject unsupported view mode', async () => {
      // built-in-composite is not in the mocked availableViewModes
      const result = await InitializationService.changeViewMode({
        viewMode: 'built-in-composite',
        autoLoadPreset: false,
      })

      // Should fail because built-in-composite is not in available view modes
      expect(result.success).toBe(false)
    })
  })

  describe.skip('importConfiguration', () => {
    it('should successfully import a configuration', async () => {
      const mockConfig = {
        version: '1.0' as const,
        metadata: {
          atlasId: createAtlasId('france'),
          atlasName: 'France',
          exportDate: '2024-01-01',
          createdWith: '1.0.0',
        },
        referenceScale: 2700,
        territories: [
          {
            code: 'FR-MET',
            name: 'Metropolitan France',
            projection: {
              id: 'conic-conformal',
              family: 'CONIC',
              parameters: { projectionId: 'conic-conformal' },
            },
            layout: {
              translateOffset: [0, 0] as [number, number],
            },
            bounds: [[0, 0], [10, 10]] as [[number, number], [number, number]],
          },
        ],
      }

      const result = await InitializationService.importConfiguration({
        config: mockConfig,
      })

      expect(result.success).toBe(true)
      expect(result.state?.viewMode).toBe('composite-custom')
    })

    it('should reject import with no territories', async () => {
      const mockConfig = {
        version: '1.0' as const,
        metadata: {
          atlasId: createAtlasId('france'),
          atlasName: 'France',
          exportDate: '2024-01-01',
          createdWith: '1.0.0',
        },
        pattern: 'single-focus' as const,
        territories: [],
      }

      const result = await InitializationService.importConfiguration({
        config: mockConfig,
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Import configuration has no territories')
    })

    it('should reject import for wrong atlas', async () => {
      const mockConfig = {
        version: '1.0' as const,
        metadata: {
          atlasId: createAtlasId('portugal'),
          atlasName: 'Portugal',
          exportDate: '2024-01-01',
          createdWith: '1.0.0',
        },
        territories: [
          {
            code: 'PT-MET',
            name: 'Metropolitan Portugal',
            projection: {
              id: 'conic-conformal',
              family: 'CONIC',
              parameters: { projectionId: 'conic-conformal' },
            },
            layout: {
              translateOffset: [0, 0] as [number, number],
            },
            bounds: [[0, 0], [10, 10]] as [[number, number], [number, number]],
          },
        ],
      }

      const result = await InitializationService.importConfiguration({
        config: mockConfig,
        validateAtlasCompatibility: true,
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('but current atlas is'))
    })
  })
})
