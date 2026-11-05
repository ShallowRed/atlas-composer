import type { AtlasId } from '@/types/branded'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'
import { describe, expect, it } from 'vitest'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { createTerritoryCode } from '@/types/branded'
import { CompositeExportService } from '../composite-export-service'

describe('compositeExportService', () => {
  describe('exportToJSON', () => {
    const parameters: Record<string, ProjectionParameters> = {
      'US-CONT': { projectionId: 'albers', rotate: [96, 0, 0], center: [-0.6, 38.7], parallels: [29.5, 45.5], scaleMultiplier: 1 },
      'FR-MET': { projectionId: 'conic-conformal', rotate: [-3, -46.2, 0], scaleMultiplier: 1 },
      'FR-RE': { projectionId: 'mercator', center: [55.52, -21.13], parallels: [12, 60], scaleMultiplier: 1 },
    }
    const provider: ProjectionParameterProvider = {
      getEffectiveParameters: code => parameters[code]!,
      getExportableParameters: code => parameters[code]!,
    }
    const composite = new CompositeProjection({
      territories: Object.keys(parameters).map(code => ({
        code: createTerritoryCode(code),
        name: code,
        center: [0, 0],
        bounds: [[-1, -1], [1, 1]],
      })),
    }, provider)

    const exported = CompositeExportService.exportToJSON(composite, 'test' as AtlasId, 'Test', provider)
    const exportedParameters = (code: string) => exported.territories.find(t => t.code === code)!.projection.parameters

    it('writes the applied rotate, center and parallels of a conic projection, albers included', () => {
      expect(exportedParameters('US-CONT')).toMatchObject({ rotate: [96, 0, 0], center: [-0.6, 38.7], parallels: [29.5, 45.5] })
    })

    it('writes the null value of an undefined parameter and the derived parallels', () => {
      expect(exportedParameters('FR-MET')).toMatchObject({ rotate: [-3, -46.2, 0], center: [0, 0], parallels: [44.2, 48.2] })
    })

    it('writes no parallels for a projection without parallels', () => {
      expect(exportedParameters('FR-RE')).toMatchObject({ rotate: [0, 0, 0], center: [55.52, -21.13] })
      expect(exportedParameters('FR-RE')).not.toHaveProperty('parallels')
    })
  })

  describe('validateExportedConfig', () => {
    const validConfig: ExportedCompositeConfig = {
      version: '1.0',
      metadata: {
        atlasId: 'france',
        atlasName: 'France',
        exportDate: new Date().toISOString(),
        createdWith: 'Atlas composer v1.0',
      },
      referenceScale: 2700,
      territories: [
        {
          code: 'FR-MET',
          name: 'France Metropolitaine',
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
      const result = CompositeExportService.validateExportedConfig(validConfig)
      expect(result.valid).toBe(true)

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
})
