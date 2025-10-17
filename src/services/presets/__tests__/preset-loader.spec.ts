import type { ExportedCompositeConfig } from '@/types/export-config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PresetLoader } from '../preset-loader'

describe('presetLoader', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('convertToDefaults', () => {
    it('should convert preset to territory defaults format', () => {
      const mockPreset: ExportedCompositeConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'france',
          atlasName: 'France',
          exportDate: '2024-01-01T00:00:00Z',
          createdWith: 'Atlas Composer 1.0',
        },
        pattern: 'single-focus',
        territories: [
          {
            code: 'FR-MET',
            name: 'Metropolitan France',
            role: 'primary',
            projection: {
              id: 'conic-conformal',
              family: 'conic',
              parameters: {
                scale: 2500,
                baseScale: 2500,
                scaleMultiplier: 1.0,
                center: [2.5, 46.5],
                rotate: [-2.5, 0, 0],
                parallels: [42, 49],
              },
            },
            layout: {
              translateOffset: [0, 0],
            },
            bounds: [[-5, 42], [10, 51]],
          },
          {
            code: 'FR-GP',
            name: 'Guadeloupe',
            role: 'secondary',
            projection: {
              id: 'mercator',
              family: 'cylindrical',
              parameters: {
                scale: 3500,
                baseScale: 2500,
                scaleMultiplier: 1.4,
              },
            },
            layout: {
              translateOffset: [-324, -38],
            },
            bounds: [[-61.8, 15.8], [-61.0, 16.5]],
          },
        ],
      }

      const result = PresetLoader.convertToDefaults(mockPreset)

      expect(result).toEqual({
        projections: {
          'FR-MET': 'conic-conformal',
          'FR-GP': 'mercator',
        },
        translations: {
          'FR-MET': { x: 0, y: 0 },
          'FR-GP': { x: -324, y: -38 },
        },
        scales: {
          'FR-MET': 1.0,
          'FR-GP': 1.4,
        },
      })
    })

    it('should handle preset with multiple territories', () => {
      const mockPreset: ExportedCompositeConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test',
          exportDate: '2024-01-01T00:00:00Z',
          createdWith: 'Atlas Composer 1.0',
        },
        pattern: 'single-focus',
        territories: [
          {
            code: 'T1',
            name: 'Territory 1',
            role: 'primary',
            projection: {
              id: 'mercator',
              family: 'cylindrical',
              parameters: { scale: 1000, baseScale: 1000, scaleMultiplier: 1.0 },
            },
            layout: { translateOffset: [10, 20] },
            bounds: [[0, 0], [10, 10]],
          },
          {
            code: 'T2',
            name: 'Territory 2',
            role: 'secondary',
            projection: {
              id: 'albers',
              family: 'conic',
              parameters: { scale: 1500, baseScale: 1000, scaleMultiplier: 1.5 },
            },
            layout: { translateOffset: [-50, 100] },
            bounds: [[10, 10], [20, 20]],
          },
          {
            code: 'T3',
            name: 'Territory 3',
            role: 'secondary',
            projection: {
              id: 'gnomonic',
              family: 'azimuthal',
              parameters: { scale: 800, baseScale: 1000, scaleMultiplier: 0.8 },
            },
            layout: { translateOffset: [75, -25] },
            bounds: [[20, 20], [30, 30]],
          },
        ],
      }

      const result = PresetLoader.convertToDefaults(mockPreset)

      expect(result.projections).toHaveProperty('T1', 'mercator')
      expect(result.projections).toHaveProperty('T2', 'albers')
      expect(result.projections).toHaveProperty('T3', 'gnomonic')
      expect(result.translations).toHaveProperty('T1')
      expect(result.translations).toHaveProperty('T2')
      expect(result.translations).toHaveProperty('T3')
      expect(result.scales).toHaveProperty('T1', 1.0)
      expect(result.scales).toHaveProperty('T2', 1.5)
      expect(result.scales).toHaveProperty('T3', 0.8)
    })

    it('should handle empty territories array', () => {
      const mockPreset: ExportedCompositeConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test',
          exportDate: '2024-01-01T00:00:00Z',
          createdWith: 'Atlas Composer 1.0',
        },
        pattern: 'single-focus',
        territories: [],
      }

      const result = PresetLoader.convertToDefaults(mockPreset)

      expect(result).toEqual({
        projections: {},
        translations: {},
        scales: {},
      })
    })
  })

  describe('extractTerritoryParameters', () => {
    it('should extract territory projection parameters including scale', () => {
      const mockPreset: ExportedCompositeConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'france',
          atlasName: 'France',
          exportDate: '2024-01-01T00:00:00Z',
          createdWith: 'Atlas Composer 1.0',
        },
        pattern: 'single-focus',
        territories: [
          {
            code: 'FR-MET',
            name: 'France Métropolitaine',
            role: 'primary',
            projection: {
              id: 'conic-conformal',
              family: 'conic',
              parameters: {
                center: [2.5, 46.5],
                rotate: [-3, -46.2, 0],
                parallels: [42, 49],
                scale: 2700,
                baseScale: 2700,
                scaleMultiplier: 1.0,
                precision: 0.1,
              },
            },
            layout: {
              translateOffset: [0, 0],
            },
            bounds: [[-5, 42], [10, 51]],
          },
          {
            code: 'FR-GP',
            name: 'Guadeloupe',
            role: 'secondary',
            projection: {
              id: 'mercator',
              family: 'cylindrical',
              parameters: {
                center: [-61.46, 16.14],
                scale: 3780,
                baseScale: 2700,
                scaleMultiplier: 1.4,
              },
            },
            layout: {
              translateOffset: [-324, -38],
            },
            bounds: [[-61.8, 15.8], [-61.0, 16.5]],
          },
        ],
      }

      const result = PresetLoader.extractTerritoryParameters(mockPreset)

      // Should extract parameters for FR-MET (has center, rotate, parallels, scaleMultiplier, precision, projectionId, translateOffset)
      expect(result).toHaveProperty('FR-MET')
      expect(result['FR-MET']).toEqual({
        projectionId: 'conic-conformal',
        center: [2.5, 46.5],
        rotate: [-3, -46.2, 0],
        parallels: [42, 49],
        scaleMultiplier: 1.0,
        precision: 0.1,
        translateOffset: [0, 0],
      })

      // Should extract parameters for FR-GP (has center, scaleMultiplier, projectionId, translateOffset)
      expect(result).toHaveProperty('FR-GP')
      expect(result['FR-GP']).toEqual({
        projectionId: 'mercator',
        center: [-61.46, 16.14],
        scaleMultiplier: 1.4,
        translateOffset: [-324, -38],
      })
    })

    it('should handle territory without projection parameters', () => {
      const mockPreset: ExportedCompositeConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test',
          exportDate: '2024-01-01T00:00:00Z',
          createdWith: 'Atlas Composer 1.0',
        },
        pattern: 'single-focus',
        territories: [
          {
            code: 'T1',
            name: 'Territory 1',
            role: 'primary',
            projection: {
              id: 'mercator',
              family: 'cylindrical',
              parameters: {
                // Only has scale values, no projection parameters
                scale: 1000,
                baseScale: 1000,
                scaleMultiplier: 1.0,
              },
            },
            layout: {
              translateOffset: [0, 0],
            },
            bounds: [[0, 0], [10, 10]],
          },
        ],
      }

      const result = PresetLoader.extractTerritoryParameters(mockPreset)

      // Should extract scale parameter, projectionId, and translateOffset for T1
      expect(result).toHaveProperty('T1')
      expect(result.T1).toEqual({
        projectionId: 'mercator',
        scaleMultiplier: 1.0,
        translateOffset: [0, 0],
      })
    })
  })

  describe('listAvailablePresets', () => {
    it('should return empty array for now', () => {
      const result = PresetLoader.listAvailablePresets()
      expect(result).toEqual([])
    })
  })

  describe('loadPreset', () => {
    it('should handle fetch errors', async () => {
      // Mock fetch to throw an error
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await PresetLoader.loadPreset('test-preset')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Unexpected error')
    })

    it('should handle 404 response', async () => {
      // Mock fetch to return 404
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      const result = await PresetLoader.loadPreset('nonexistent-preset')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Failed to load preset')
      expect(result.errors[0]).toContain('Not Found')
    })

    it('should handle invalid JSON', async () => {
      // Mock fetch to return invalid JSON
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('invalid json {'),
      })

      const result = await PresetLoader.loadPreset('invalid-preset')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should load and validate valid preset', async () => {
      const validPreset: ExportedCompositeConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test Atlas',
          exportDate: '2024-01-01T00:00:00Z',
          createdWith: 'Atlas Composer 1.0',
        },
        pattern: 'single-focus',
        territories: [
          {
            code: 'T1',
            name: 'Territory 1',
            role: 'primary',
            projection: {
              id: 'mercator',
              family: 'cylindrical',
              parameters: {
                center: [0, 0],
                rotate: [0, 0, 0],
                parallels: [30, 60],
                scale: 1000,
                baseScale: 1000,
                scaleMultiplier: 1.0,
                translateOffset: [0, 0],
                translate: [0, 0],
                precision: 0.1,
              },
            },
            layout: {
              translateOffset: [0, 0],
            },
            bounds: [[0, 0], [10, 10]],
          },
        ],
      }

      // Mock fetch to return valid preset
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(validPreset)),
      })

      const result = await PresetLoader.loadPreset('test-preset')

      expect(result.success).toBe(true)
      expect(result.preset).toBeDefined()
      expect(result.preset?.metadata.atlasId).toBe('test')
      expect(result.errors).toEqual([])
    })
  })

  describe('validatePreset', () => {
    it('should validate a valid preset', () => {
      const validPreset: ExportedCompositeConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test',
          exportDate: '2024-01-01T00:00:00Z',
          createdWith: 'Atlas Composer 1.0',
        },
        pattern: 'single-focus',
        territories: [
          {
            code: 'T1',
            name: 'Territory 1',
            role: 'primary',
            projection: {
              id: 'mercator',
              family: 'cylindrical',
              parameters: {
                center: [0, 0],
                rotate: [0, 0, 0],
                parallels: [30, 60],
                scale: 1000,
                baseScale: 1000,
                scaleMultiplier: 1.0,
                translateOffset: [0, 0],
                translate: [0, 0],
                precision: 0.1,
              },
            },
            layout: { translateOffset: [0, 0] },
            bounds: [[0, 0], [10, 10]],
          },
        ],
      }

      const result = PresetLoader.validatePreset(validPreset)

      expect(result.success).toBe(true)
      expect(result.preset).toBeDefined()
    })
  })
})
