/**
 * Tests for CompositeExportService
 */

import type { CompositeProjectionConfig, ExportedCompositeConfig } from '@/types'
import { describe, expect, it } from 'vitest'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { CompositeExportService } from '../composite-export-service'

describe('compositeExportService', () => {
  // Mock composite projection configuration (single-focus pattern)
  const mockSingleFocusConfig: CompositeProjectionConfig = {
    type: 'single-focus',
    mainland: {
      code: 'FR-MET',
      name: 'France Métropolitaine',
      center: [2.5, 46.5],
      bounds: [[-5, 41], [10, 51]],
    },
    overseasTerritories: [
      {
        code: 'FR-GP',
        name: 'Guadeloupe',
        center: [-61.46, 16.14],
        bounds: [[-61.81, 15.83], [-61, 16.52]],
      },
    ],
  }

  // Mock equal-members configuration
  const mockEqualMembersConfig: CompositeProjectionConfig = {
    type: 'equal-members',
    mainlands: [
      {
        code: 'FR',
        name: 'France',
        center: [2.5, 46.5],
        bounds: [[-5, 41], [10, 51]],
      },
      {
        code: 'DE',
        name: 'Germany',
        center: [10.5, 51.5],
        bounds: [[5.5, 47.5], [15.5, 55.5]],
      },
    ],
    overseasTerritories: [],
  }

  describe('exportToJSON', () => {
    it('should export a single-focus composite projection', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)

      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
      )

      expect(exported).toBeDefined()
      expect(exported.version).toBe('1.0')
      expect(exported.pattern).toBe('single-focus')
      expect(exported.metadata.atlasId).toBe('france')
      expect(exported.metadata.atlasName).toBe('France')
      expect(exported.territories).toHaveLength(2)
    })

    it('should export an equal-members composite projection', () => {
      const compositeProj = new CompositeProjection(mockEqualMembersConfig)

      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'europe',
        'European Union',
        mockEqualMembersConfig,
      )

      expect(exported.pattern).toBe('equal-members')
      expect(exported.territories).toHaveLength(2)
      expect(exported.territories[0]?.role).toBe('member')
      expect(exported.territories[1]?.role).toBe('member')
    })

    it('should include all territory information', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)

      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
      )

      const mainlandTerritory = exported.territories[0]
      expect(mainlandTerritory).toBeDefined()
      expect(mainlandTerritory?.code).toBe('FR-MET')
      expect(mainlandTerritory?.name).toBe('France Métropolitaine')
      expect(mainlandTerritory?.role).toBe('primary')
      expect(mainlandTerritory?.projection.id).toBe('conic-conformal')
      expect(mainlandTerritory?.projection.parameters).toBeDefined()
      expect(mainlandTerritory?.layout).toBeDefined()
    })

    it('should include projection parameters', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)

      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
      )

      const territory = exported.territories[0]
      // Only scaleMultiplier should be exported, not deprecated scale/baseScale
      expect(territory?.projection.parameters.scale).toBeUndefined()
      expect(territory?.projection.parameters.baseScale).toBeUndefined()
      expect(territory?.projection.parameters.scaleMultiplier).toBeDefined()
      expect(typeof territory?.projection.parameters.scaleMultiplier).toBe('number')
    })

    it('should include layout information', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)

      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
      )

      const overseasTerritory = exported.territories[1]
      expect(overseasTerritory?.layout.translateOffset).toBeDefined()
      expect(Array.isArray(overseasTerritory?.layout.translateOffset)).toBe(true)
      expect(overseasTerritory?.layout.translateOffset).toHaveLength(2)
    })

    it('should include metadata with timestamp', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)

      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
        undefined, // parameterProvider
        undefined, // referenceScale
        undefined, // canvasDimensions
        'Test export', // notes
      )

      expect(exported.metadata.exportDate).toBeDefined()
      expect(exported.metadata.createdWith).toBeDefined()
      expect(exported.metadata.notes).toBe('Test export')

      // Verify timestamp is valid ISO format
      const date = new Date(exported.metadata.exportDate)
      expect(date.toString()).not.toBe('Invalid Date')
    })

    it('should include all territory configuration', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)

      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
      )

      expect(exported.territories).toBeDefined()
      expect(exported.territories.length).toBeGreaterThan(0)
      expect(exported.pattern).toBeDefined()
      expect(exported.metadata).toBeDefined()
    })
  })

  describe('validateExportedConfig', () => {
    it('should validate a correct configuration', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)
      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
      )

      const result = CompositeExportService.validateExportedConfig(exported)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing version', () => {
      const invalidConfig = {
        metadata: { atlasId: 'france', atlasName: 'France', exportDate: new Date().toISOString(), createdWith: 'test' },
        pattern: 'single-focus',
        referenceScale: 2700,
        territories: [],
      } as any

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing version field')
    })

    it('should detect missing metadata fields', () => {
      const invalidConfig = {
        version: '1.0',
        metadata: { atlasId: '', atlasName: '', exportDate: '', createdWith: '' },
        pattern: 'single-focus',
        referenceScale: 2700,
        territories: [],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('metadata'))).toBe(true)
    })

    it('should detect invalid pattern', () => {
      const invalidConfig = {
        version: '1.0',
        metadata: { atlasId: 'test', atlasName: 'Test', exportDate: new Date().toISOString(), createdWith: 'test' },
        pattern: 'invalid-pattern' as any,
        referenceScale: 2700,
        territories: [],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid pattern'))).toBe(true)
    })

    it('should detect empty territories array', () => {
      const invalidConfig = {
        version: '1.0',
        metadata: { atlasId: 'test', atlasName: 'Test', exportDate: new Date().toISOString(), createdWith: 'test' },
        pattern: 'single-focus',
        referenceScale: 2700,
        territories: [],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('No territories'))).toBe(true)
    })

    it('should detect missing territory fields', () => {
      const invalidConfig = {
        version: '1.0',
        metadata: { atlasId: 'test', atlasName: 'Test', exportDate: new Date().toISOString(), createdWith: 'test' },
        pattern: 'single-focus',
        referenceScale: 2700,
        territories: [
          {
            code: '',
            name: '',
            role: 'primary',
            projection: {
              id: '',
              family: 'conic',
              parameters: {} as any,
            },
            layout: { translateOffset: [0, 0] },
            bounds: [[0, 0], [0, 0]],
          },
        ],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should issue warnings for unknown projections', () => {
      const configWithUnknownProj = {
        version: '1.0',
        metadata: { atlasId: 'test', atlasName: 'Test', exportDate: new Date().toISOString(), createdWith: 'test' },
        pattern: 'single-focus',
        referenceScale: 2700,
        territories: [
          {
            code: 'TEST',
            name: 'Test',
            role: 'primary',
            projection: {
              id: 'unknown-projection-xyz',
              family: 'conic',
              parameters: {
                scale: 2700,
                baseScale: 2700,
                scaleMultiplier: 1.0,
              },
            },
            layout: { translateOffset: [0, 0] },
            bounds: [[0, 0], [0, 0]],
          },
        ],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(configWithUnknownProj)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('Unknown projection'))).toBe(true)
    })

    it('should validate pixelClipExtent format', () => {
      // Valid pixelClipExtent
      const validConfig = {
        version: '1.0',
        metadata: { atlasId: 'test', atlasName: 'Test', exportDate: new Date().toISOString(), createdWith: 'test' },
        pattern: 'single-focus',
        referenceScale: 2700,
        territories: [{
          code: 'TEST',
          name: 'Test Territory',
          role: 'primary',
          projection: { id: 'mercator', family: 'cylindrical', parameters: { scaleMultiplier: 1.0 } },
          layout: {
            translateOffset: [0, 0],
            pixelClipExtent: [-50, -40, 60, 45] as [number, number, number, number],
          },
          bounds: [[0, 0], [1, 1]],
        }],
      } as ExportedCompositeConfig

      const validResult = CompositeExportService.validateExportedConfig(validConfig)
      expect(validResult.valid).toBe(true)

      // Invalid pixelClipExtent - wrong length
      const invalidConfig = {
        ...validConfig,
        territories: [{
          ...validConfig.territories[0],
          layout: {
            translateOffset: [0, 0],
            pixelClipExtent: [-50, -40, 60] as any, // Only 3 elements instead of 4
          },
        }],
      } as ExportedCompositeConfig

      const invalidResult = CompositeExportService.validateExportedConfig(invalidConfig)
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors.some(e => e.includes('Invalid pixelClipExtent format'))).toBe(true)

      // Both formats present should generate warning
      const bothFormatsConfig = {
        ...validConfig,
        territories: [{
          ...validConfig.territories[0],
          layout: {
            translateOffset: [0, 0],
            pixelClipExtent: [-50, -40, 60, 45] as [number, number, number, number],
          },
        }],
      } as ExportedCompositeConfig

      const result = CompositeExportService.validateExportedConfig(bothFormatsConfig)
      expect(result.valid).toBe(true)
    })
  })

  describe('generateCode', () => {
    it('should generate code placeholder', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)
      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
      )

      const code = CompositeExportService.generateCode(exported, {
        language: 'typescript',
        format: 'd3',
        includeComments: true,
      })

      expect(code).toBeDefined()
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    })

    it('should export pixelClipExtent when parameter provider has it', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)

      // Mock parameter provider with pixelClipExtent
      const mockParameterProvider = {
        getEffectiveParameters: (territoryCode: string) => {
          if (territoryCode === 'FR-GP') {
            return {
              pixelClipExtent: [-50, -40, 60, 45] as [number, number, number, number],
            }
          }
          return {}
        },
        getExportableParameters: (territoryCode: string) => {
          const params = {
            center: territoryCode === 'FR-MET' ? [2.5, 46.5] : [-61.46, 16.14],
            scaleMultiplier: 1,
          }
          if (territoryCode === 'FR-GP') {
            return {
              ...params,
              pixelClipExtent: [-50, -40, 60, 45] as [number, number, number, number],
            }
          }
          return params
        },
      }

      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
        mockParameterProvider as any,
      )

      expect(exported).toBeDefined()

      // Find the Guadeloupe territory
      const guadeloupe = exported.territories.find(t => t.code === 'FR-GP')
      expect(guadeloupe).toBeDefined()
      expect(guadeloupe?.layout.pixelClipExtent).toEqual([-50, -40, 60, 45])

      // Mainland should not have pixelClipExtent
      const mainland = exported.territories.find(t => t.code === 'FR-MET')
      expect(mainland).toBeDefined()
      expect(mainland?.layout.pixelClipExtent).toBeNull()
    })
  })
})
