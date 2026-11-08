import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { CompositeConfigContext } from '@/core/presets'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { createAtlasId } from '@/types/branded'
import { CompositeImportService } from '../composite-import-service'

describe('compositeImportService', () => {
  const validConfig: CompositeProjectionConfig = {
    version: '1.1',
    metadata: {
      atlasId: 'france',
      atlasName: 'France',
      exportDate: '2025-10-10T12:00:00.000Z',
      createdWith: 'Atlas composer v1.0',
    },
    referenceScale: 2700,
    canvasDimensions: { width: 960, height: 500 },
    territories: [
      {
        code: 'FR-MET',
        name: 'Metropolitan France',
        projection: {
          id: 'azimuthal-equal-area',
          family: 'AZIMUTHAL',
          parameters: {
            center: [2.5, 47],
            rotate: [-2.5, -47, 0],
            scaleMultiplier: 1.0,
          },
        },
        layout: {
          translateOffset: [0, 0],
        },
        bounds: [
          [-5, 41],
          [10, 51],
        ],
      },
    ],
  }

  let context: CompositeConfigContext

  beforeAll(async () => {
    await loadAtlasFromConfigs(createAtlasId('france'))
    context = { atlasConfig: getAtlasConfig(createAtlasId('france')), canvasDimensions: { width: 800, height: 600 } }
  })

  function importConfig(config: unknown) {
    return CompositeImportService.importFromJSON(JSON.stringify(config), context)
  }

  describe('importFromJSON', () => {
    it('should successfully parse valid JSON config', () => {
      expect(importConfig(validConfig)).toEqual({ ok: true, value: validConfig })
    })

    it('should reject invalid JSON', () => {
      const result = CompositeImportService.importFromJSON('{ invalid json }', context)

      expect(result.ok).toBe(false)
      expect(!result.ok && result.error[0]).toContain('Invalid JSON')
    })

    it('should reject config missing version', () => {
      const { version: _version, ...config } = validConfig

      expect(importConfig(config)).toEqual({ ok: false, error: ['version: must have required property \'version\''] })
    })

    it('should reject config missing metadata', () => {
      const { metadata: _metadata, ...config } = validConfig

      expect(importConfig(config)).toEqual({ ok: false, error: ['metadata: must have required property \'metadata\''] })
    })

    it('should reject config with no territories', () => {
      expect(importConfig({ ...validConfig, territories: [] })).toEqual({ ok: false, error: ['territories: must NOT have fewer than 1 items'] })
    })

    it('should reject a version of another major', () => {
      const result = importConfig({ ...validConfig, version: '2.0' })

      expect(result.ok).toBe(false)
      expect(!result.ok && result.error[0]).toMatch(/^version: /)
    })

    it('should reject territory missing required fields', () => {
      const { code: _code, ...territory } = validConfig.territories[0]

      expect(importConfig({ ...validConfig, territories: [territory] })).toEqual({ ok: false, error: ['territories[0].code: must have required property \'code\''] })
    })

    it('should reject a projection unknown to the application', () => {
      const [territory] = validConfig.territories
      const config = { ...validConfig, territories: [{ ...territory, projection: { ...territory.projection, id: 'equal-earth' } }] }

      expect(importConfig(config)).toEqual({ ok: false, error: ['Territory FR-MET: unknown projection \'equal-earth\''] })
    })
  })

  describe('importFromFile', () => {
    it('should reject non-JSON files', async () => {
      const file = new File(['{}'], 'config.txt', { type: 'text/plain' })
      const result = await CompositeImportService.importFromFile(file, context)

      expect(result.ok).toBe(false)
      expect(!result.ok && result.error[0]).toContain('JSON file')
    })

    it('should reject files that are too large', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], 'config.json', { type: 'application/json' })
      const result = await CompositeImportService.importFromFile(file, context)

      expect(result.ok).toBe(false)
      expect(!result.ok && result.error[0]).toContain('too large')
    })

    it('should successfully import valid JSON file', async () => {
      const file = new File([JSON.stringify(validConfig)], 'config.json', { type: 'application/json' })

      expect(await CompositeImportService.importFromFile(file, context)).toEqual({ ok: true, value: validConfig })
    })
  })
})
