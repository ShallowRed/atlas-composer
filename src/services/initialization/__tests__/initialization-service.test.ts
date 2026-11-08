import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { createAtlasId } from '@/types/branded'

import { InitializationService } from '../initialization-service'

vi.mock('@/core/atlases/registry', async importOriginal => ({
  ...await importOriginal<typeof import('@/core/atlases/registry')>(),
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
}))

vi.mock('@/services/atlas/atlas-service', () => ({
  AtlasService: vi.fn().mockImplementation(() => ({
    getAllTerritories: vi.fn(() => [
      { code: 'FR-MET', name: 'Metropolitan France' },
      { code: 'FR-GP', name: 'Guadeloupe' },
    ]),
  })),
}))

vi.mock('@/core/territories/territory-defaults-service', () => ({
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
    getDefaultCompositeProjection: vi.fn(async () => 'conic-conformal-france'),
    getRecommendedProjection: vi.fn(async () => 'natural-earth'),
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
  beforeAll(async () => {
    await loadAtlasFromConfigs(createAtlasId('france'))
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe.skip('importConfiguration', () => {
    it('should successfully import a configuration', async () => {
      const mockConfig: CompositeProjectionConfig = {
        version: '1.0',
        metadata: {
          atlasId: createAtlasId('france'),
          atlasName: 'France',
          exportDate: '2024-01-01',
          createdWith: '1.0.0',
        },
        referenceScale: 2700,
        canvasDimensions: { width: 960, height: 500 },
        territories: [
          {
            code: 'FR-MET',
            name: 'Metropolitan France',
            projection: {
              id: 'conic-conformal',
              family: 'CONIC',
              parameters: {},
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
      const mockConfig: CompositeProjectionConfig = {
        version: '1.0',
        metadata: {
          atlasId: createAtlasId('france'),
          atlasName: 'France',
          exportDate: '2024-01-01',
          createdWith: '1.0.0',
        },
        referenceScale: 2700,
        canvasDimensions: { width: 960, height: 500 },
        territories: [] as unknown as CompositeProjectionConfig['territories'],
      }

      const result = await InitializationService.importConfiguration({
        config: mockConfig,
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Import configuration has no territories')
    })

    it('should reject import for wrong atlas', async () => {
      const mockConfig: CompositeProjectionConfig = {
        version: '1.0',
        metadata: {
          atlasId: createAtlasId('portugal'),
          atlasName: 'Portugal',
          exportDate: '2024-01-01',
          createdWith: '1.0.0',
        },
        referenceScale: 2700,
        canvasDimensions: { width: 960, height: 500 },
        territories: [
          {
            code: 'PT-MET',
            name: 'Metropolitan Portugal',
            projection: {
              id: 'conic-conformal',
              family: 'CONIC',
              parameters: {},
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
