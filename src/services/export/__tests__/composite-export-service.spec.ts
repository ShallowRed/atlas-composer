/**
 * Tests for CompositeExportService
 *
 * Tests validation logic and static methods without requiring full CompositeProjection instantiation.
 * Export-with-CompositeProjection tests require integration testing context.
 */

import type { ExportedCompositeConfig } from '@/types/export-config'
import { describe, expect, it } from 'vitest'
import { CompositeExportService } from '../composite-export-service'

describe('compositeExportService', () => {
  describe('validateExportedConfig', () => {
    const validConfig: ExportedCompositeConfig = {
      version: '1.0',
      metadata: {
        atlasId: 'france',
        atlasName: 'France',
        exportDate: new Date().toISOString(),
        createdWith: 'Atlas composer v1.0',
      },
      pattern: 'single-focus',
      referenceScale: 2700,
      territories: [
        {
          code: 'FR-MET',
          name: 'France Metropolitaine',
          role: 'primary',
          projection: {
            id: 'conic-conformal',
            family: 'conic',
            parameters: {
              center: [2.5, 46.5],
              rotate: [-3, -46.2, 0],
              parallels: [45, 50],
              scaleMultiplier: 1.0,
            },
          },
          layout: {
            translateOffset: [0, 0],
          },
          bounds: [[-5, 41], [10, 51]],
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
              scaleMultiplier: 1.2,
            },
          },
          layout: {
            translateOffset: [100, -50],
          },
          bounds: [[-61.81, 15.83], [-61, 16.52]],
        },
      ],
    }

    it('should validate a correct configuration', () => {
      const result = CompositeExportService.validateExportedConfig(validConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing version', () => {
      const invalidConfig = {
        metadata: { atlasId: 'france', atlasName: 'France', exportDate: new Date().toISOString(), createdWith: 'test' },
        pattern: 'single-focus',
        referenceScale: 2700,
        territories: validConfig.territories,
      } as unknown as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing version field')
    })

    it('should warn about unknown version', () => {
      const configWithUnknownVersion = {
        ...validConfig,
        version: '2.0' as const,
      } as unknown as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(configWithUnknownVersion)

      expect(result.warnings.some(w => w.includes('Unknown version'))).toBe(true)
    })

    it('should detect missing metadata fields', () => {
      const invalidConfig = {
        ...validConfig,
        metadata: { atlasId: '', atlasName: '', exportDate: '', createdWith: '' },
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('metadata'))).toBe(true)
    })

    it('should detect invalid pattern', () => {
      const invalidConfig = {
        ...validConfig,
        pattern: 'invalid-pattern' as ExportedCompositeConfig['pattern'],
      }

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid pattern'))).toBe(true)
    })

    it('should accept valid patterns', () => {
      const patterns: ExportedCompositeConfig['pattern'][] = ['single-focus', 'equal-members']

      for (const pattern of patterns) {
        const config = { ...validConfig, pattern }
        const result = CompositeExportService.validateExportedConfig(config)
        expect(result.errors.some(e => e.includes('Invalid pattern'))).toBe(false)
      }
    })

    it('should detect empty territories array', () => {
      const invalidConfig = {
        ...validConfig,
        territories: [],
      }

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('No territories'))).toBe(true)
    })

    it('should detect missing territory code', () => {
      const invalidConfig = {
        ...validConfig,
        territories: [
          {
            ...validConfig.territories[0],
            code: '',
          },
        ],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Missing code'))).toBe(true)
    })

    it('should detect missing territory name', () => {
      const invalidConfig = {
        ...validConfig,
        territories: [
          {
            ...validConfig.territories[0],
            name: '',
          },
        ],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Missing name'))).toBe(true)
    })

    it('should detect missing projection id', () => {
      const baseTerritory = validConfig.territories[0]
      if (!baseTerritory) {
        throw new Error('Test setup error: missing base territory')
      }

      const invalidConfig = {
        ...validConfig,
        territories: [
          {
            ...baseTerritory,
            projection: {
              ...baseTerritory.projection,
              id: '',
            },
          },
        ],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Missing projection.id'))).toBe(true)
    })

    it('should issue warnings for unknown projections', () => {
      const configWithUnknownProj = {
        ...validConfig,
        territories: [
          {
            ...validConfig.territories[0],
            projection: {
              id: 'unknown-projection-xyz',
              family: 'conic',
              parameters: {
                scaleMultiplier: 1.0,
              },
            },
          },
        ],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(configWithUnknownProj)

      expect(result.warnings.some(w => w.includes('Unknown projection'))).toBe(true)
    })

    it('should validate pixelClipExtent format - valid 4-tuple', () => {
      const configWithClipExtent = {
        ...validConfig,
        territories: [
          {
            ...validConfig.territories[0],
            layout: {
              translateOffset: [0, 0] as [number, number],
              pixelClipExtent: [-50, -40, 60, 45] as [number, number, number, number],
            },
          },
        ],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(configWithClipExtent)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid pixelClipExtent format - wrong length', () => {
      const invalidConfig = {
        ...validConfig,
        territories: [
          {
            ...validConfig.territories[0],
            layout: {
              translateOffset: [0, 0] as [number, number],
              pixelClipExtent: [-50, -40, 60] as unknown as [number, number, number, number],
            },
          },
        ],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid pixelClipExtent format'))).toBe(true)
    })

    it('should validate multi-territory configurations', () => {
      // Two territories should both be validated
      const result = CompositeExportService.validateExportedConfig(validConfig)
      expect(result.valid).toBe(true)

      // Break second territory
      const invalidConfig = {
        ...validConfig,
        territories: [
          validConfig.territories[0],
          {
            ...validConfig.territories[1],
            code: '', // Invalid
          },
        ],
      } as ExportedCompositeConfig

      const invalidResult = CompositeExportService.validateExportedConfig(invalidConfig)
      expect(invalidResult.valid).toBe(false)
    })
  })

  describe('generateCode', () => {
    const testConfig: ExportedCompositeConfig = {
      version: '1.0',
      metadata: {
        atlasId: 'france',
        atlasName: 'France',
        exportDate: '2025-01-01T00:00:00.000Z',
        createdWith: 'Atlas composer v1.0',
      },
      pattern: 'single-focus',
      referenceScale: 2700,
      territories: [
        {
          code: 'FR-MET',
          name: 'France Metropolitaine',
          role: 'primary',
          projection: {
            id: 'conic-conformal',
            family: 'conic',
            parameters: {
              center: [2.5, 46.5],
              rotate: [-3, -46.2, 0],
              parallels: [45, 50],
              scaleMultiplier: 1.0,
            },
          },
          layout: { translateOffset: [0, 0] },
          bounds: [[-5, 41], [10, 51]],
        },
      ],
    }

    it('should generate TypeScript D3 code', () => {
      const code = CompositeExportService.generateCode(testConfig, {
        language: 'typescript',
        format: 'd3',
        includeComments: true,
      })

      expect(code).toBeDefined()
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    })

    it('should generate JavaScript D3 code', () => {
      const code = CompositeExportService.generateCode(testConfig, {
        language: 'javascript',
        format: 'd3',
        includeComments: true,
      })

      expect(code).toBeDefined()
      expect(typeof code).toBe('string')
    })

    it('should generate Observable Plot code', () => {
      const code = CompositeExportService.generateCode(testConfig, {
        language: 'javascript',
        format: 'plot',
        includeComments: true,
      })

      expect(code).toBeDefined()
      expect(typeof code).toBe('string')
    })

    it('should respect includeComments option', () => {
      const codeWithComments = CompositeExportService.generateCode(testConfig, {
        language: 'typescript',
        format: 'd3',
        includeComments: true,
      })

      const codeWithoutComments = CompositeExportService.generateCode(testConfig, {
        language: 'typescript',
        format: 'd3',
        includeComments: false,
      })

      // Code with comments should be longer or contain comment syntax
      expect(codeWithComments.length).toBeGreaterThanOrEqual(codeWithoutComments.length)
    })
  })
})
