import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { CompositeConfigContext } from '@/core/presets'
import type { PresetIssue } from '@/core/types/errors'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { err } from '@/core/types/result'
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

  function invalid(issue: PresetIssue) {
    return err({ code: 'IMPORT_INVALID', issues: [issue] })
  }

  function importConfig(config: unknown) {
    return CompositeImportService.importFromJSON(JSON.stringify(config), context)
  }

  describe('importFromJSON', () => {
    it('should successfully parse valid JSON config', () => {
      expect(importConfig(validConfig)).toEqual({ ok: true, value: validConfig })
    })

    it('should reject invalid JSON', () => {
      expect(CompositeImportService.importFromJSON('{ invalid json }', context)).toEqual(err({ code: 'IMPORT_MALFORMED_JSON' }))
    })

    it('should reject config missing version', () => {
      const { version: _version, ...config } = validConfig

      expect(importConfig(config)).toEqual(invalid({ code: 'PRESET_SCHEMA_MISSING_FIELD', path: 'version' }))
    })

    it('should reject config missing metadata', () => {
      const { metadata: _metadata, ...config } = validConfig

      expect(importConfig(config)).toEqual(invalid({ code: 'PRESET_SCHEMA_MISSING_FIELD', path: 'metadata' }))
    })

    it('should reject config with no territories', () => {
      expect(importConfig({ ...validConfig, territories: [] })).toEqual(invalid({ code: 'PRESET_SCHEMA_INVALID_VALUE', path: 'territories' }))
    })

    it('should reject a version of another major', () => {
      expect(importConfig({ ...validConfig, version: '2.0' })).toEqual(invalid({ code: 'PRESET_SCHEMA_VERSION_UNSUPPORTED', path: 'version' }))
    })

    it('should reject territory missing required fields', () => {
      const { code: _code, ...territory } = validConfig.territories[0]

      expect(importConfig({ ...validConfig, territories: [territory] })).toEqual(invalid({ code: 'PRESET_SCHEMA_MISSING_FIELD', path: 'territories[0].code' }))
    })

    it('should reject a projection unknown to the application', () => {
      const [territory] = validConfig.territories
      const config = { ...validConfig, territories: [{ ...territory, projection: { ...territory.projection, id: 'equal-earth' } }] }

      expect(importConfig(config)).toEqual(invalid({ code: 'PRESET_PROJECTION_UNKNOWN', territory: 'FR-MET', projectionId: 'equal-earth' }))
    })

    it('should reject a projection unknown to the application on a territory without a text code', () => {
      const [territory] = validConfig.territories
      const config = { ...validConfig, territories: [{ ...territory, code: 42, projection: { ...territory.projection, id: 'equal-earth' } }] }

      expect(importConfig(config)).toEqual(invalid({ code: 'PRESET_PROJECTION_UNKNOWN', territory: null, projectionId: 'equal-earth' }))
    })
  })

  describe('importFromFile', () => {
    it('should reject non-JSON files', async () => {
      const file = new File(['{}'], 'config.txt', { type: 'text/plain' })

      expect(await CompositeImportService.importFromFile(file, context)).toEqual(err({ code: 'IMPORT_NOT_JSON_FILE', fileName: 'config.txt' }))
    })

    it('should reject files that are too large', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], 'config.json', { type: 'application/json' })

      expect(await CompositeImportService.importFromFile(file, context)).toEqual(err({ code: 'IMPORT_FILE_TOO_LARGE', fileName: 'config.json', maxSizeInMb: 10 }))
    })

    it('should report a file that cannot be read', async () => {
      const file = new File(['{}'], 'config.json', { type: 'application/json' })
      vi.spyOn(file, 'text').mockRejectedValue(new Error('read failed'))

      expect(await CompositeImportService.importFromFile(file, context)).toEqual(err({ code: 'IMPORT_FILE_UNREADABLE', fileName: 'config.json' }))
    })

    it('should successfully import valid JSON file', async () => {
      const file = new File([JSON.stringify(validConfig)], 'config.json', { type: 'application/json' })

      expect(await CompositeImportService.importFromFile(file, context)).toEqual({ ok: true, value: validConfig })
    })
  })
})
