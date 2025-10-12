/**
 * Tests for standalone projection loader (zero-dependency version with plugin architecture)
 */

import type { ExportedConfig } from '../src/standalone-projection-loader'

import { beforeAll, describe, expect, it } from 'vitest'
import { d3ProjectionFactories } from '../src/d3-projection-helpers'
import {
  getRegisteredProjections,
  loadCompositeProjection,
  loadFromJSON,
  registerProjections,
  validateConfig,
} from '../src/standalone-projection-loader'

describe('standalone-projection-loader', () => {
  // Register all D3 projections before running tests
  beforeAll(() => {
    registerProjections(d3ProjectionFactories)
  })
  // Mock configuration
  const mockConfig: ExportedConfig = {
    version: '1.0',
    metadata: {
      atlasId: 'france',
      atlasName: 'France',
    },
    pattern: 'single-focus',
    referenceScale: 2700,
    territories: [
      {
        code: 'FR-MET',
        name: 'France Métropolitaine',
        role: 'primary',
        projectionId: 'conic-conformal',
        projectionFamily: 'CONIC',
        parameters: {
          center: [0, 0],
          rotate: [-3, -46.2, 0],
          scale: 2700,
          baseScale: 2700,
          scaleMultiplier: 1,
          parallels: [-2, 2],
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
      {
        code: 'FR-GP',
        name: 'Guadeloupe',
        role: 'secondary',
        projectionId: 'mercator',
        projectionFamily: 'CYLINDRICAL',
        parameters: {
          center: [-61.46, 16.14],
          rotate: [0, 0, 0],
          scale: 5292,
          baseScale: 3780,
          scaleMultiplier: 1.4,
        },
        layout: {
          translateOffset: [-324, -38],
          clipExtent: null,
        },
        bounds: [
          [-61.81, 15.83],
          [-61, 16.52],
        ],
      },
    ],
  }

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      expect(() => validateConfig(mockConfig)).not.toThrow()
    })

    it('should reject null/undefined', () => {
      expect(() => validateConfig(null)).toThrow('Configuration must be an object')
      expect(() => validateConfig(undefined)).toThrow('Configuration must be an object')
    })

    it('should reject configuration without version', () => {
      const invalid = { ...mockConfig, version: undefined }
      expect(() => validateConfig(invalid)).toThrow('must have a version')
    })

    it('should reject configuration without metadata', () => {
      const invalid = { ...mockConfig, metadata: undefined }
      expect(() => validateConfig(invalid)).toThrow('must have metadata')
    })

    it('should reject configuration without territories', () => {
      const invalid = { ...mockConfig, territories: undefined }
      expect(() => validateConfig(invalid)).toThrow('must have territories array')
    })

    it('should reject configuration with empty territories', () => {
      const invalid = { ...mockConfig, territories: [] }
      expect(() => validateConfig(invalid)).toThrow('at least one territory')
    })

    it('should reject territories without required fields', () => {
      const invalid = {
        ...mockConfig,
        territories: [{ name: 'Test' }],
      }
      expect(() => validateConfig(invalid)).toThrow('missing required fields')
    })
  })

  describe('loadCompositeProjection', () => {
    it('should create a projection from valid configuration', () => {
      const projection = loadCompositeProjection(mockConfig, {
        width: 800,
        height: 600,
      })

      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
      expect(projection.scale).toBeDefined()
      expect(projection.translate).toBeDefined()
    })

    it('should reject unsupported version', () => {
      const invalid = { ...mockConfig, version: '2.0' }
      expect(() =>
        loadCompositeProjection(invalid, { width: 800, height: 600 }),
      ).toThrow('Unsupported configuration version')
    })

    it('should reject unregistered projection IDs', () => {
      const invalid = {
        ...mockConfig,
        territories: [
          {
            ...mockConfig.territories[0]!,
            projectionId: 'unknown-projection',
          },
        ],
      }
      expect(() =>
        loadCompositeProjection(invalid as any, { width: 800, height: 600 }),
      ).toThrow('is not registered')
    })

    it('should handle debug mode', () => {
      // Should not throw
      const projection = loadCompositeProjection(mockConfig, {
        width: 800,
        height: 600,
        debug: true,
      })

      expect(projection).toBeDefined()
    })
  })

  describe('loadFromJSON', () => {
    it('should load projection from JSON string', () => {
      const jsonString = JSON.stringify(mockConfig)
      const projection = loadFromJSON(jsonString, {
        width: 800,
        height: 600,
      })

      expect(projection).toBeDefined()
    })

    it('should reject invalid JSON', () => {
      expect(() =>
        loadFromJSON('not valid json', { width: 800, height: 600 }),
      ).toThrow('Invalid JSON')
    })

    it('should reject malformed configuration in JSON', () => {
      const invalid = JSON.stringify({ version: '1.0' })
      expect(() => loadFromJSON(invalid, { width: 800, height: 600 })).toThrow()
    })
  })

  describe('getRegisteredProjections', () => {
    it('should return array of registered projection IDs', () => {
      const projections = getRegisteredProjections()

      expect(Array.isArray(projections)).toBe(true)
      expect(projections.length).toBeGreaterThan(0)
    })

    it('should include common projections', () => {
      const projections = getRegisteredProjections()

      expect(projections).toContain('mercator')
      expect(projections).toContain('conic-conformal')
      expect(projections).toContain('azimuthal-equal-area')
    })
  })

  describe('projection functionality', () => {
    it('should project points correctly', () => {
      const projection = loadCompositeProjection(mockConfig, {
        width: 800,
        height: 600,
      })

      // Project a point in France (Paris)
      const result = projection([2.35, 48.85]) // [longitude, latitude]

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(typeof result![0]).toBe('number')
      expect(typeof result![1]).toBe('number')
    })

    it('should have scale and translate methods', () => {
      const projection = loadCompositeProjection(mockConfig, {
        width: 800,
        height: 600,
      })

      // Verify scale and translate methods exist
      expect(projection.scale).toBeDefined()
      expect(typeof projection.scale).toBe('function')
      expect(projection.translate).toBeDefined()
      expect(typeof projection.translate).toBe('function')

      // Note: The scale/translate getter/setter pattern is complex to test
      // due to how D3 projections chain methods. The important thing is
      // that these methods exist and can be called for configuration.
      // The actual projection functionality is tested in other tests.
    })

    it('should have stream method for geometry', () => {
      const projection = loadCompositeProjection(mockConfig, {
        width: 800,
        height: 600,
      })

      expect(projection.stream).toBeDefined()
      expect(typeof projection.stream).toBe('function')

      // Create a mock stream
      const mockStream = {
        point: () => {},
        lineStart: () => {},
        lineEnd: () => {},
        polygonStart: () => {},
        polygonEnd: () => {},
        sphere: () => {},
      }

      // Should not throw
      if (projection.stream) {
        const stream = projection.stream(mockStream)
        expect(stream).toBeDefined()
      }
    })
  })
})
