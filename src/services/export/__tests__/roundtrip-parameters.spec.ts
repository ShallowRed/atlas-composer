/**
 * Roundtrip Test for Export/Import JSON Fidelity
 *
 * Verifies that exported configurations can be imported back without data loss.
 * Tests JSON structure preservation, not store integration (see integration tests for full flow).
 */

import type { ExportedCompositeConfig } from '@/types/export-config'
import { describe, expect, it } from 'vitest'
import { CompositeExportService } from '@/services/export/composite-export-service'
import { CompositeImportService } from '@/services/export/composite-import-service'
import { createTerritoryCode } from '@/types/branded'

describe('export/import JSON roundtrip', () => {
  /**
   * Complete valid configuration with all supported parameters
   */
  const fullConfig: ExportedCompositeConfig = {
    version: '1.0',
    metadata: {
      atlasId: 'france',
      atlasName: 'France',
      exportDate: '2025-01-01T12:00:00.000Z',
      createdWith: 'Atlas composer v1.0',
      notes: 'Test configuration with all parameters',
    },
    pattern: 'single-focus',
    referenceScale: 2700,
    canvasDimensions: { width: 960, height: 500 },
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
            scaleMultiplier: 1.2,
            clipAngle: 90,
            precision: 0.1,
          },
        },
        layout: {
          translateOffset: [0, 0],
          pixelClipExtent: null,
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
            scaleMultiplier: 1.4,
          },
        },
        layout: {
          translateOffset: [-324, -38],
          pixelClipExtent: [-54, -48, 55, 38],
        },
        bounds: [[-62, 15], [-61, 17]],
      },
    ],
  }

  describe('json serialization roundtrip', () => {
    it('should preserve all fields through JSON stringify/parse cycle', () => {
      const jsonString = JSON.stringify(fullConfig)
      const parsed = JSON.parse(jsonString) as ExportedCompositeConfig

      expect(parsed.version).toBe(fullConfig.version)
      expect(parsed.metadata).toEqual(fullConfig.metadata)
      expect(parsed.pattern).toBe(fullConfig.pattern)
      expect(parsed.referenceScale).toBe(fullConfig.referenceScale)
      expect(parsed.canvasDimensions).toEqual(fullConfig.canvasDimensions)
      expect(parsed.territories).toHaveLength(fullConfig.territories.length)
    })

    it('should preserve all territory parameters', () => {
      const jsonString = JSON.stringify(fullConfig)
      const parsed = JSON.parse(jsonString) as ExportedCompositeConfig

      for (let i = 0; i < fullConfig.territories.length; i++) {
        const original = fullConfig.territories[i]
        const restored = parsed.territories[i]

        expect(restored?.code).toBe(original?.code)
        expect(restored?.name).toBe(original?.name)
        expect(restored?.role).toBe(original?.role)
        expect(restored?.projection.id).toBe(original?.projection.id)
        expect(restored?.projection.family).toBe(original?.projection.family)
        expect(restored?.projection.parameters).toEqual(original?.projection.parameters)
        expect(restored?.layout).toEqual(original?.layout)
        expect(restored?.bounds).toEqual(original?.bounds)
      }
    })

    it('should preserve pixelClipExtent values exactly', () => {
      const jsonString = JSON.stringify(fullConfig)
      const parsed = JSON.parse(jsonString) as ExportedCompositeConfig

      const guadeloupe = parsed.territories.find(t => t.code === 'FR-GP')
      expect(guadeloupe?.layout.pixelClipExtent).toEqual([-54, -48, 55, 38])

      const mainland = parsed.territories.find(t => t.code === 'FR-MET')
      expect(mainland?.layout.pixelClipExtent).toBeNull()
    })
  })

  describe('import validation after export', () => {
    it('should successfully import a valid exported configuration', () => {
      const jsonString = JSON.stringify(fullConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.config).toBeDefined()
    })

    it('should validate exported configuration passes validation', () => {
      const validationResult = CompositeExportService.validateExportedConfig(fullConfig)

      expect(validationResult.valid).toBe(true)
      expect(validationResult.errors).toHaveLength(0)
    })

    it('should have matching territory count after import', () => {
      const jsonString = JSON.stringify(fullConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.config?.territories.length).toBe(fullConfig.territories.length)
    })
  })

  describe('parameter preservation', () => {
    it('should preserve center coordinates', () => {
      const jsonString = JSON.stringify(fullConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      const mainlandOriginal = fullConfig.territories.find(t => t.code === 'FR-MET')
      const mainlandImported = result.config?.territories.find(t => t.code === 'FR-MET')

      expect(mainlandImported?.projection.parameters.center).toEqual(
        mainlandOriginal?.projection.parameters.center,
      )
    })

    it('should preserve rotate triplet', () => {
      const jsonString = JSON.stringify(fullConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      const mainlandOriginal = fullConfig.territories.find(t => t.code === 'FR-MET')
      const mainlandImported = result.config?.territories.find(t => t.code === 'FR-MET')

      expect(mainlandImported?.projection.parameters.rotate).toEqual(
        mainlandOriginal?.projection.parameters.rotate,
      )
    })

    it('should preserve parallels tuple', () => {
      const jsonString = JSON.stringify(fullConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      const mainlandOriginal = fullConfig.territories.find(t => t.code === 'FR-MET')
      const mainlandImported = result.config?.territories.find(t => t.code === 'FR-MET')

      expect(mainlandImported?.projection.parameters.parallels).toEqual(
        mainlandOriginal?.projection.parameters.parallels,
      )
    })

    it('should preserve scaleMultiplier', () => {
      const jsonString = JSON.stringify(fullConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      for (const original of fullConfig.territories) {
        const imported = result.config?.territories.find(t => t.code === original.code)
        expect(imported?.projection.parameters.scaleMultiplier).toBe(
          original.projection.parameters.scaleMultiplier,
        )
      }
    })

    it('should preserve translateOffset', () => {
      const jsonString = JSON.stringify(fullConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      for (const original of fullConfig.territories) {
        const imported = result.config?.territories.find(t => t.code === original.code)
        expect(imported?.layout.translateOffset).toEqual(original.layout.translateOffset)
      }
    })

    it('should preserve optional parameters when present', () => {
      const jsonString = JSON.stringify(fullConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      const mainlandOriginal = fullConfig.territories.find(t => t.code === 'FR-MET')
      const mainlandImported = result.config?.territories.find(t => t.code === 'FR-MET')

      expect(mainlandImported?.projection.parameters.clipAngle).toBe(
        mainlandOriginal?.projection.parameters.clipAngle,
      )
      expect(mainlandImported?.projection.parameters.precision).toBe(
        mainlandOriginal?.projection.parameters.precision,
      )
    })
  })

  describe('edge cases', () => {
    it('should handle configuration without optional fields', () => {
      const minimalConfig: ExportedCompositeConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test',
          exportDate: new Date().toISOString(),
          createdWith: 'Test',
        },
        pattern: 'single-focus',
        territories: [
          {
            code: createTerritoryCode('TEST'),
            name: 'Test Territory',
            role: 'primary',
            projection: {
              id: 'mercator',
              family: 'cylindrical',
              parameters: {
                scaleMultiplier: 1.0,
              },
            },
            layout: { translateOffset: [0, 0] },
            bounds: [[0, 0], [1, 1]],
          },
        ],
      }

      const jsonString = JSON.stringify(minimalConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(true)
      expect(result.config?.referenceScale).toBeUndefined()
      expect(result.config?.canvasDimensions).toBeUndefined()
    })

    it('should preserve floating point precision', () => {
      const preciseConfig: ExportedCompositeConfig = {
        ...fullConfig,
        territories: [
          {
            ...fullConfig.territories[0]!,
            projection: {
              ...fullConfig.territories[0]!.projection,
              parameters: {
                center: [2.123456, 46.654321],
                scaleMultiplier: 1.234567,
              },
            },
          },
        ],
      }

      const jsonString = JSON.stringify(preciseConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      const imported = result.config?.territories[0]
      expect(imported?.projection.parameters.center).toEqual([2.123456, 46.654321])
      expect(imported?.projection.parameters.scaleMultiplier).toBe(1.234567)
    })

    it('should handle equal-members pattern', () => {
      const equalMembersConfig: ExportedCompositeConfig = {
        ...fullConfig,
        pattern: 'equal-members',
        territories: fullConfig.territories.map(t => ({
          ...t,
          role: 'member' as const,
        })),
      }

      const jsonString = JSON.stringify(equalMembersConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(true)
      expect(result.config?.pattern).toBe('equal-members')
      expect(result.config?.territories.every(t => t.role === 'member')).toBe(true)
    })
  })
})
