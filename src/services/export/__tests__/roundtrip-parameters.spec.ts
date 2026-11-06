import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { CompositeConfigContext } from '@/core/presets'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { CompositeImportService } from '@/services/export/composite-import-service'
import { createAtlasId } from '@/types/branded'

describe('export/import JSON roundtrip', () => {
  const fullConfig: CompositeProjectionConfig = {
    version: '1.1',
    metadata: {
      atlasId: 'france',
      atlasName: 'France',
      exportDate: '2025-01-01T12:00:00.000Z',
      createdWith: 'Atlas composer v1.0',
      notes: 'Test configuration with all parameters',
    },
    referenceScale: 2700,
    canvasDimensions: { width: 960, height: 500 },
    territories: [
      {
        code: 'FR-MET',
        name: 'France Metropolitaine',
        projection: {
          id: 'conic-conformal',
          family: 'CONIC',
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
        },
        bounds: [[-5, 41], [10, 51]],
      },
      {
        code: 'FR-GP',
        name: 'Guadeloupe',
        projection: {
          id: 'mercator',
          family: 'CYLINDRICAL',
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

  let context: CompositeConfigContext

  beforeAll(async () => {
    await loadAtlasFromConfigs(createAtlasId('france'))
    context = { atlasConfig: getAtlasConfig(createAtlasId('france')), canvasDimensions: { width: 800, height: 600 } }
  })

  function importConfig(config: CompositeProjectionConfig) {
    const result = CompositeImportService.importFromJSON(JSON.stringify(config), context)
    if (!result.ok) {
      throw new Error(result.error.join(', '))
    }
    return result.value
  }

  describe('json serialization roundtrip', () => {
    it('should preserve all fields through JSON stringify/parse cycle', () => {
      const jsonString = JSON.stringify(fullConfig)
      const parsed = JSON.parse(jsonString) as CompositeProjectionConfig

      expect(parsed.version).toBe(fullConfig.version)
      expect(parsed.metadata).toEqual(fullConfig.metadata)
      expect(parsed.referenceScale).toBe(fullConfig.referenceScale)
      expect(parsed.canvasDimensions).toEqual(fullConfig.canvasDimensions)
      expect(parsed.territories).toHaveLength(fullConfig.territories.length)
    })

    it('should preserve all territory parameters', () => {
      const jsonString = JSON.stringify(fullConfig)
      const parsed = JSON.parse(jsonString) as CompositeProjectionConfig

      for (let i = 0; i < fullConfig.territories.length; i++) {
        const original = fullConfig.territories[i]
        const restored = parsed.territories[i]

        expect(restored?.code).toBe(original?.code)
        expect(restored?.name).toBe(original?.name)
        expect(restored?.projection.id).toBe(original?.projection.id)
        expect(restored?.projection.family).toBe(original?.projection.family)
        expect(restored?.projection.parameters).toEqual(original?.projection.parameters)
        expect(restored?.layout).toEqual(original?.layout)
        expect(restored?.bounds).toEqual(original?.bounds)
      }
    })

    it('should preserve pixelClipExtent values exactly', () => {
      const jsonString = JSON.stringify(fullConfig)
      const parsed = JSON.parse(jsonString) as CompositeProjectionConfig

      const guadeloupe = parsed.territories.find(t => t.code === 'FR-GP')
      expect(guadeloupe?.layout.pixelClipExtent).toEqual([-54, -48, 55, 38])

      const franceMet = parsed.territories.find(t => t.code === 'FR-MET')
      expect(franceMet?.layout).not.toHaveProperty('pixelClipExtent')
    })
  })

  describe('import validation after export', () => {
    it('should successfully import a valid exported configuration', () => {
      expect(importConfig(fullConfig)).toEqual(fullConfig)
    })
  })

  describe('parameter preservation', () => {
    it('should preserve center coordinates', () => {
      const imported = importConfig(fullConfig)

      const franceMetOriginal = fullConfig.territories.find(t => t.code === 'FR-MET')
      const franceMetImported = imported.territories.find(t => t.code === 'FR-MET')

      expect(franceMetImported?.projection.parameters.center).toEqual(
        franceMetOriginal?.projection.parameters.center,
      )
    })

    it('should preserve rotate triplet', () => {
      const imported = importConfig(fullConfig)

      const franceMetOriginal = fullConfig.territories.find(t => t.code === 'FR-MET')
      const franceMetImported = imported.territories.find(t => t.code === 'FR-MET')

      expect(franceMetImported?.projection.parameters.rotate).toEqual(
        franceMetOriginal?.projection.parameters.rotate,
      )
    })

    it('should preserve parallels tuple', () => {
      const imported = importConfig(fullConfig)

      const franceMetOriginal = fullConfig.territories.find(t => t.code === 'FR-MET')
      const franceMetImported = imported.territories.find(t => t.code === 'FR-MET')

      expect(franceMetImported?.projection.parameters.parallels).toEqual(
        franceMetOriginal?.projection.parameters.parallels,
      )
    })

    it('should preserve scaleMultiplier', () => {
      const imported = importConfig(fullConfig)

      for (const original of fullConfig.territories) {
        const restored = imported.territories.find(t => t.code === original.code)
        expect(restored?.projection.parameters.scaleMultiplier).toBe(
          original.projection.parameters.scaleMultiplier,
        )
      }
    })

    it('should preserve translateOffset', () => {
      const imported = importConfig(fullConfig)

      for (const original of fullConfig.territories) {
        const restored = imported.territories.find(t => t.code === original.code)
        expect(restored?.layout.translateOffset).toEqual(original.layout.translateOffset)
      }
    })

    it('should preserve optional parameters when present', () => {
      const imported = importConfig(fullConfig)

      const franceMetOriginal = fullConfig.territories.find(t => t.code === 'FR-MET')
      const franceMetImported = imported.territories.find(t => t.code === 'FR-MET')

      expect(franceMetImported?.projection.parameters.clipAngle).toBe(
        franceMetOriginal?.projection.parameters.clipAngle,
      )
      expect(franceMetImported?.projection.parameters.precision).toBe(
        franceMetOriginal?.projection.parameters.precision,
      )
    })
  })

  describe('edge cases', () => {
    it('should read the deprecated forms of a configuration', () => {
      const minimalConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'france',
        },
        territories: [
          {
            code: 'FR-GP',
            name: 'Guadeloupe',
            projection: {
              id: 'mercator',
              family: 'cylindrical',
              parameters: {
                center: [-61.46, 16.14],
                scaleMultiplier: 1.0,
              },
            },
            layout: { translateOffset: [0, 0], pixelClipExtent: null },
          },
        ],
      }

      const result = CompositeImportService.importFromJSON(JSON.stringify(minimalConfig), context)

      expect(result).toEqual({
        ok: true,
        value: {
          ...minimalConfig,
          referenceScale: 2700,
          canvasDimensions: { width: 800, height: 600 },
          territories: [{
            ...minimalConfig.territories[0],
            projection: { ...minimalConfig.territories[0]!.projection, family: 'CYLINDRICAL' },
            layout: { translateOffset: [0, 0] },
          }],
        },
      })
    })

    it('should preserve floating point precision', () => {
      const preciseConfig: CompositeProjectionConfig = {
        ...fullConfig,
        territories: [
          {
            ...fullConfig.territories[0],
            projection: {
              ...fullConfig.territories[0].projection,
              parameters: {
                center: [2.123456, 46.654321],
                scaleMultiplier: 1.234567,
              },
            },
          },
        ],
      }

      const [imported] = importConfig(preciseConfig).territories
      expect(imported.projection.parameters.center).toEqual([2.123456, 46.654321])
      expect(imported.projection.parameters.scaleMultiplier).toBe(1.234567)
    })
  })
})
