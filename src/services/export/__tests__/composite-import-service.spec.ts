/**
 * Tests for CompositeImportService
 */

import type { ExportedCompositeConfig } from '@/types/export-config'
import { describe, expect, it } from 'vitest'
import { CompositeImportService } from '../composite-import-service'

describe('compositeImportService', () => {
  const validConfig: ExportedCompositeConfig = {
    version: '1.0',
    metadata: {
      atlasId: 'france',
      atlasName: 'France',
      exportDate: '2025-10-10T12:00:00.000Z',
      createdWith: 'Atlas composer v1.0',
    },
    pattern: 'single-focus',
    referenceScale: 2700,
    territories: [
      {
        code: 'FRA',
        name: 'Mainland France',
        role: 'primary',
        projectionId: 'azimuthal-equal-area',
        projectionFamily: 'azimuthal',
        parameters: {
          center: [2.5, 47],
          rotate: [-2.5, -47, 0],
          scale: 2700,
          baseScale: 2700,
          scaleMultiplier: 1,
        },
        layout: {
          translateOffset: [0, 0],
          clipExtent: null,
        },
        bounds: [
          [-5, 41],
          [10, 51],
        ],
      },
    ],
  }

  describe('importFromJSON', () => {
    it('should successfully parse valid JSON config', () => {
      const jsonString = JSON.stringify(validConfig)
      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(true)
      expect(result.config).toEqual(validConfig)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid JSON', () => {
      const invalidJSON = '{ invalid json }'
      const result = CompositeImportService.importFromJSON(invalidJSON)

      expect(result.success).toBe(false)
      expect(result.config).toBeUndefined()
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Invalid JSON')
    })

    it('should reject config missing version', () => {
      const invalidConfig = { ...validConfig }
      delete (invalidConfig as any).version
      const jsonString = JSON.stringify(invalidConfig)

      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      // The error might be from migration check or validation
      const hasVersionError = result.errors.some(e =>
        e.includes('version') || e.includes('migrate'),
      )
      expect(hasVersionError).toBe(true)
    })

    it('should reject config missing metadata', () => {
      const invalidConfig = { ...validConfig }
      delete (invalidConfig as any).metadata
      const jsonString = JSON.stringify(invalidConfig)

      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing metadata')
    })

    it('should reject config with invalid pattern', () => {
      const invalidConfig = { ...validConfig, pattern: 'invalid-pattern' as any }
      const jsonString = JSON.stringify(invalidConfig)

      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid pattern'))).toBe(true)
    })

    it('should reject config with no territories', () => {
      const invalidConfig = { ...validConfig, territories: [] }
      const jsonString = JSON.stringify(invalidConfig)

      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('No territories in configuration')
    })

    it('should reject future version that cannot be migrated', () => {
      const configWithUnknownVersion = { ...validConfig, version: '2.0' }
      const jsonString = JSON.stringify(configWithUnknownVersion)

      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('migrate') || e.includes('version'))).toBe(true)
    })

    it('should reject territory missing required fields', () => {
      const invalidConfig = {
        ...validConfig,
        territories: [
          {
            ...validConfig.territories[0],
            code: undefined,
          },
        ],
      }
      const jsonString = JSON.stringify(invalidConfig)

      const result = CompositeImportService.importFromJSON(jsonString)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Missing code'))).toBe(true)
    })
  })

  describe('importFromFile', () => {
    it('should reject non-JSON files', async () => {
      const file = new File(['{}'], 'config.txt', { type: 'text/plain' })
      const result = await CompositeImportService.importFromFile(file)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('JSON file'))).toBe(true)
    })

    it('should reject files that are too large', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], 'config.json', { type: 'application/json' })
      const result = await CompositeImportService.importFromFile(file)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('too large'))).toBe(true)
    })

    it('should successfully import valid JSON file', async () => {
      const jsonString = JSON.stringify(validConfig)
      const file = new File([jsonString], 'config.json', { type: 'application/json' })
      const result = await CompositeImportService.importFromFile(file)

      expect(result.success).toBe(true)
      expect(result.config).toEqual(validConfig)
    })
  })

  describe('checkAtlasCompatibility', () => {
    it('should pass when atlas IDs match', () => {
      const result = CompositeImportService.checkAtlasCompatibility(validConfig, 'france')

      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('should warn when atlas IDs do not match', () => {
      const result = CompositeImportService.checkAtlasCompatibility(validConfig, 'portugal')

      expect(result.valid).toBe(true) // Still valid, just a warning
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('exported for atlas')
    })
  })
})
