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
      offset: [0, 0],
      projectionType: 'conic-conformal',
      rotate: [-3, -46.2],
      parallels: [0, 60],
      bounds: [[-5, 41], [10, 51]],
    },
    overseasTerritories: [
      {
        code: 'FR-GP',
        name: 'Guadeloupe',
        center: [-61.46, 16.14],
        offset: [100, -50],
        projectionType: 'mercator',
        baseScaleMultiplier: 1.2,
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
        offset: [0, 0],
        projectionType: 'conic-conformal',
        bounds: [[-5, 41], [10, 51]],
      },
      {
        code: 'DE',
        name: 'Germany',
        center: [10.5, 51.5],
        offset: [200, 0],
        projectionType: 'conic-conformal',
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
        'eu',
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
      expect(mainlandTerritory?.projectionId).toBe('conic-conformal')
      expect(mainlandTerritory?.parameters).toBeDefined()
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
      expect(territory?.parameters.scale).toBeDefined()
      expect(typeof territory?.parameters.scale).toBe('number')
      expect(territory?.parameters.baseScale).toBeDefined()
      expect(territory?.parameters.scaleMultiplier).toBeDefined()
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
        'Test export',
      )

      expect(exported.metadata.exportDate).toBeDefined()
      expect(exported.metadata.createdWith).toBeDefined()
      expect(exported.metadata.notes).toBe('Test export')
      
      // Verify timestamp is valid ISO format
      const date = new Date(exported.metadata.exportDate)
      expect(date.toString()).not.toBe('Invalid Date')
    })

    it('should calculate reference scale from first territory', () => {
      const compositeProj = new CompositeProjection(mockSingleFocusConfig)
      
      const exported = CompositeExportService.exportToJSON(
        compositeProj,
        'france',
        'France',
        mockSingleFocusConfig,
      )

      expect(exported.referenceScale).toBeDefined()
      expect(typeof exported.referenceScale).toBe('number')
      expect(exported.referenceScale).toBeGreaterThan(0)
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
            projectionId: '',
            projectionFamily: 'conic',
            parameters: {} as any,
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
            projectionId: 'unknown-projection-xyz',
            projectionFamily: 'conic',
            parameters: {
              scale: 2700,
              baseScale: 2700,
              scaleMultiplier: 1.0,
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
  })
})
