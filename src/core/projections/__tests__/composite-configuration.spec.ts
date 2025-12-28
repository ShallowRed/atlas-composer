/**
 * Tests for CompositeConfiguration Aggregate
 */

import type { TerritoryProjectionConfig } from '../composite-configuration'

import { beforeEach, describe, expect, it } from 'vitest'

import {
  CompositeConfiguration,
  CompositeConfigurationError,
} from '../composite-configuration'

describe('compositeConfiguration', () => {
  const validCanvasDimensions = { width: 800, height: 600 }

  const createValidTerritory = (code: string): TerritoryProjectionConfig => ({
    code,
    name: `Territory ${code}`,
    role: 'primary',
    projectionId: 'conic-conformal',
    family: 'CONIC',
    parameters: {},
    translateOffset: [0, 0],
    pixelClipExtent: null,
  })

  describe('constructor', () => {
    it('should create a valid configuration', () => {
      const config = new CompositeConfiguration(
        'atlas-france',
        'France',
        1000,
        validCanvasDimensions,
      )

      expect(config.atlasId).toBe('atlas-france')
      expect(config.atlasName).toBe('France')
      expect(config.referenceScale).toBe(1000)
      expect(config.canvasDimensions).toEqual(validCanvasDimensions)
    })

    it('should throw error for empty atlas ID', () => {
      expect(() => new CompositeConfiguration('', 'France', 1000, validCanvasDimensions))
        .toThrow(CompositeConfigurationError)
      expect(() => new CompositeConfiguration('  ', 'France', 1000, validCanvasDimensions))
        .toThrow(CompositeConfigurationError)
    })

    it('should throw error for non-positive reference scale', () => {
      expect(() => new CompositeConfiguration('atlas-france', 'France', 0, validCanvasDimensions))
        .toThrow(CompositeConfigurationError)
      expect(() => new CompositeConfiguration('atlas-france', 'France', -100, validCanvasDimensions))
        .toThrow(CompositeConfigurationError)
    })

    it('should throw error for non-positive canvas dimensions', () => {
      expect(() => new CompositeConfiguration('atlas-france', 'France', 1000, { width: 0, height: 600 }))
        .toThrow(CompositeConfigurationError)
      expect(() => new CompositeConfiguration('atlas-france', 'France', 1000, { width: 800, height: -10 }))
        .toThrow(CompositeConfigurationError)
    })
  })

  describe('referenceScale', () => {
    it('should get and set reference scale', () => {
      const config = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
      expect(config.referenceScale).toBe(1000)

      config.setReferenceScale(2000)
      expect(config.referenceScale).toBe(2000)
    })

    it('should throw error when setting non-positive scale', () => {
      const config = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
      expect(() => config.setReferenceScale(0)).toThrow(CompositeConfigurationError)
      expect(() => config.setReferenceScale(-500)).toThrow(CompositeConfigurationError)
    })
  })

  describe('canvasDimensions', () => {
    it('should get and set canvas dimensions', () => {
      const config = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
      expect(config.canvasDimensions).toEqual(validCanvasDimensions)

      config.setCanvasDimensions({ width: 1024, height: 768 })
      expect(config.canvasDimensions).toEqual({ width: 1024, height: 768 })
    })

    it('should return a copy of dimensions (immutability)', () => {
      const config = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
      const dims1 = config.canvasDimensions
      const dims2 = config.canvasDimensions
      expect(dims1).not.toBe(dims2) // Different references
      expect(dims1).toEqual(dims2)
    })

    it('should throw error for non-positive dimensions', () => {
      const config = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
      expect(() => config.setCanvasDimensions({ width: 0, height: 600 }))
        .toThrow(CompositeConfigurationError)
    })
  })

  describe('territory management', () => {
    let config: CompositeConfiguration

    beforeEach(() => {
      config = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
    })

    describe('addTerritory', () => {
      it('should add a valid territory', () => {
        const territory = createValidTerritory('FR-MET')
        config.addTerritory(territory)

        expect(config.hasTerritory('FR-MET')).toBe(true)
        expect(config.territoryCount).toBe(1)
      })

      it('should throw error for territory without code', () => {
        const territory = createValidTerritory('')
        expect(() => config.addTerritory(territory)).toThrow(CompositeConfigurationError)
      })

      it('should throw error for territory without projection ID', () => {
        const territory = {
          ...createValidTerritory('FR-MET'),
          projectionId: '',
        }
        expect(() => config.addTerritory(territory)).toThrow(CompositeConfigurationError)
      })

      it('should throw error for negative scale multiplier', () => {
        const territory = {
          ...createValidTerritory('FR-MET'),
          parameters: { scaleMultiplier: -1 },
        }
        expect(() => config.addTerritory(territory)).toThrow(CompositeConfigurationError)
      })

      it('should accept zero scale multiplier in parameters as undefined', () => {
        const territory = {
          ...createValidTerritory('FR-MET'),
          parameters: { scaleMultiplier: 0 },
        }
        // Zero is also not allowed
        expect(() => config.addTerritory(territory)).toThrow(CompositeConfigurationError)
      })
    })

    describe('getTerritory', () => {
      it('should return territory by code', () => {
        const territory = createValidTerritory('FR-MET')
        config.addTerritory(territory)

        const retrieved = config.getTerritory('FR-MET')
        expect(retrieved).toBeDefined()
        expect(retrieved?.code).toBe('FR-MET')
      })

      it('should return undefined for non-existent territory', () => {
        expect(config.getTerritory('UNKNOWN')).toBeUndefined()
      })

      it('should return a copy (immutability)', () => {
        const territory = createValidTerritory('FR-MET')
        config.addTerritory(territory)

        const retrieved1 = config.getTerritory('FR-MET')
        const retrieved2 = config.getTerritory('FR-MET')
        expect(retrieved1).not.toBe(retrieved2)
        expect(retrieved1).toEqual(retrieved2)
      })
    })

    describe('updateTerritory', () => {
      it('should update existing territory', () => {
        const territory = createValidTerritory('FR-MET')
        config.addTerritory(territory)

        config.updateTerritory('FR-MET', { name: 'France Metropolitan' })

        const updated = config.getTerritory('FR-MET')
        expect(updated?.name).toBe('France Metropolitan')
        expect(updated?.projectionId).toBe('conic-conformal') // Other fields unchanged
      })

      it('should throw error for non-existent territory', () => {
        expect(() => config.updateTerritory('UNKNOWN', { name: 'Test' }))
          .toThrow(CompositeConfigurationError)
      })

      it('should prevent code change', () => {
        const territory = createValidTerritory('FR-MET')
        config.addTerritory(territory)

        config.updateTerritory('FR-MET', { code: 'FR-NEW' } as any)

        // Code should remain unchanged
        expect(config.hasTerritory('FR-MET')).toBe(true)
        expect(config.hasTerritory('FR-NEW')).toBe(false)
      })
    })

    describe('removeTerritory', () => {
      it('should remove existing territory', () => {
        config.addTerritory(createValidTerritory('FR-MET'))
        config.addTerritory(createValidTerritory('FR-GP'))

        const result = config.removeTerritory('FR-MET')

        expect(result).toBe(true)
        expect(config.hasTerritory('FR-MET')).toBe(false)
        expect(config.territoryCount).toBe(1)
      })

      it('should return false for non-existent territory', () => {
        config.addTerritory(createValidTerritory('FR-MET'))
        expect(config.removeTerritory('UNKNOWN')).toBe(false)
      })

      it('should throw error when trying to remove last territory', () => {
        config.addTerritory(createValidTerritory('FR-MET'))
        expect(() => config.removeTerritory('FR-MET'))
          .toThrow(CompositeConfigurationError)
      })
    })

    describe('getAllTerritories', () => {
      it('should return all territories as array', () => {
        config.addTerritory(createValidTerritory('FR-MET'))
        config.addTerritory(createValidTerritory('FR-GP'))
        config.addTerritory(createValidTerritory('FR-MQ'))

        const territories = config.getAllTerritories()
        expect(territories).toHaveLength(3)
        expect(territories.map(t => t.code)).toContain('FR-MET')
        expect(territories.map(t => t.code)).toContain('FR-GP')
        expect(territories.map(t => t.code)).toContain('FR-MQ')
      })

      it('should return copies (immutability)', () => {
        config.addTerritory(createValidTerritory('FR-MET'))

        const territories1 = config.getAllTerritories()
        const territories2 = config.getAllTerritories()

        expect(territories1[0]).not.toBe(territories2[0])
        expect(territories1[0]).toEqual(territories2[0])
      })
    })

    describe('getTerritoryCodes', () => {
      it('should return array of territory codes', () => {
        config.addTerritory(createValidTerritory('FR-MET'))
        config.addTerritory(createValidTerritory('FR-GP'))

        const codes = config.getTerritoryCodes()
        expect(codes).toHaveLength(2)
        expect(codes).toContain('FR-MET')
        expect(codes).toContain('FR-GP')
      })
    })

    describe('role-based queries', () => {
      beforeEach(() => {
        config.addTerritory({
          ...createValidTerritory('FR-MET'),
          role: 'primary',
        })
        config.addTerritory({
          ...createValidTerritory('FR-GP'),
          role: 'secondary',
        })
        config.addTerritory({
          ...createValidTerritory('FR-MQ'),
          role: 'secondary',
        })
      })

      it('should get primary territories', () => {
        const primary = config.getPrimaryTerritories()
        expect(primary).toHaveLength(1)
        expect(primary[0]?.code).toBe('FR-MET')
      })

      it('should get secondary territories', () => {
        const secondary = config.getSecondaryTerritories()
        expect(secondary).toHaveLength(2)
        expect(secondary.map(t => t.code)).toContain('FR-GP')
        expect(secondary.map(t => t.code)).toContain('FR-MQ')
      })
    })
  })

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const config = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
      config.addTerritory(createValidTerritory('FR-MET'))

      const json = config.toJSON()

      expect(json.atlasId).toBe('atlas-france')
      expect(json.atlasName).toBe('France')
      expect(json.referenceScale).toBe(1000)
      expect(json.canvasDimensions).toEqual(validCanvasDimensions)
      expect(json.territories).toHaveLength(1)
      expect(json.territories[0]?.code).toBe('FR-MET')
    })

    it('should deserialize from JSON', () => {
      const originalConfig = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
      originalConfig.addTerritory(createValidTerritory('FR-MET'))
      originalConfig.addTerritory(createValidTerritory('FR-GP'))

      const json = originalConfig.toJSON()
      const restored = CompositeConfiguration.fromJSON(json)

      expect(restored.atlasId).toBe('atlas-france')
      expect(restored.atlasName).toBe('France')
      expect(restored.referenceScale).toBe(1000)
      expect(restored.canvasDimensions).toEqual(validCanvasDimensions)
      expect(restored.territoryCount).toBe(2)
      expect(restored.hasTerritory('FR-MET')).toBe(true)
      expect(restored.hasTerritory('FR-GP')).toBe(true)
    })

    it('should roundtrip serialize/deserialize correctly', () => {
      const config = new CompositeConfiguration('atlas-france', 'France', 1000, validCanvasDimensions)
      config.addTerritory({
        ...createValidTerritory('FR-MET'),
        parameters: { rotate: [0, 0, 0], parallels: [45, 50] },
        translateOffset: [100, 200],
        pixelClipExtent: [0, 0, 800, 600],
      })

      const json = config.toJSON()
      const restored = CompositeConfiguration.fromJSON(json)
      const restoredJson = restored.toJSON()

      expect(restoredJson).toEqual(json)
    })
  })
})
