/**
 * Parameter Registry Tests - New Implementation
 */

import type { ParameterDefinition } from '../parameter-registry'

import { beforeEach, describe, expect, it } from 'vitest'
import { createTerritoryCode } from '@/types/branded'

import { registerAllParameters } from '../parameter-definitions'
import { parameterRegistry } from '../parameter-registry'

describe('parameterRegistry', () => {
  beforeEach(() => {
    // Clear the singleton registry and repopulate it
    ;(parameterRegistry as any).definitions.clear()
    // Re-register all parameters
    registerAllParameters()
  })

  describe('parameter registration', () => {
    it('should register a parameter definition', () => {
      const def: ParameterDefinition = {
        key: 'testParam',
        displayName: 'Test Parameter',
        description: 'Test parameter for testing',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        familyConstraints: {
          CYLINDRICAL: {
            relevant: true,
            required: false,
            min: 100,
            max: 10000,
          },
        },
      }

      parameterRegistry.register(def)
      expect(parameterRegistry.get('testParam')).toEqual(def)
    })

    it('should return undefined for unregistered parameters', () => {
      expect(parameterRegistry.get('unknown')).toBeUndefined()
    })

    it('should return all registered parameters', () => {
      const allParams = parameterRegistry.getAll()
      expect(allParams.length).toBeGreaterThan(0)

      // Should include core parameters
      const keys = allParams.map(p => p.key)
      expect(keys).toContain('scaleMultiplier')
      expect(keys).toContain('center')
      expect(keys).toContain('rotate')
    })
  })

  describe('parameter filtering', () => {
    it('should return exportable parameters', () => {
      const exportable = parameterRegistry.getExportable()
      expect(exportable.length).toBeGreaterThan(0)

      // All should have exportable: true
      exportable.forEach((param) => {
        expect(param.exportable).toBe(true)
      })
    })

    it('should return required parameters', () => {
      const required = parameterRegistry.getRequired()
      expect(required.length).toBeGreaterThan(0)

      // All should have requiresPreset: true
      required.forEach((param) => {
        expect(param.requiresPreset).toBe(true)
      })
    })

    it('should return parameters relevant for projection family', () => {
      const cylindrical = parameterRegistry.getRelevant('CYLINDRICAL')
      expect(cylindrical.length).toBeGreaterThan(0)

      // Should include scaleMultiplier and center for CYLINDRICAL
      const keys = cylindrical.map(d => d.key)
      expect(keys).toContain('scaleMultiplier')
      expect(keys).toContain('center')

      const azimuthal = parameterRegistry.getRelevant('AZIMUTHAL')
      expect(azimuthal.length).toBeGreaterThan(0)

      // Should include scaleMultiplier for AZIMUTHAL
      const azKeys = azimuthal.map(d => d.key)
      expect(azKeys).toContain('scaleMultiplier')
    })
  })

  describe('parameter constraints', () => {
    it('should return constraints for family', () => {
      const constraints = parameterRegistry.getConstraintsForFamily('scaleMultiplier', 'CYLINDRICAL')
      expect(constraints.relevant).toBe(true)
      expect(constraints.min).toBe(0.01)
      expect(constraints.max).toBe(10)
    })

    it('should return empty constraints for unknown parameter', () => {
      const constraints = parameterRegistry.getConstraintsForFamily('unknown', 'CYLINDRICAL')
      expect(constraints.relevant).toBe(false)
      expect(constraints.required).toBe(false)
    })
  })

  describe('parameter validation', () => {
    it('should validate valid number parameters', () => {
      const result = parameterRegistry.validate('scaleMultiplier', 1.5, 'CYLINDRICAL')
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid number parameters', () => {
      const tooLow = parameterRegistry.validate('scaleMultiplier', 0.005, 'CYLINDRICAL')
      expect(tooLow.isValid).toBe(false)
      expect(tooLow.error).toContain('must be >= 0.01')

      const tooHigh = parameterRegistry.validate('scaleMultiplier', 15, 'CYLINDRICAL')
      expect(tooHigh.isValid).toBe(false)
      expect(tooHigh.error).toContain('must be <= 10')
    })

    it('should reject non-numeric values for number parameters', () => {
      const result = parameterRegistry.validate('scaleMultiplier', 'invalid', 'CYLINDRICAL')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('must be a valid number')
    })

    it('should reject invalid tuple2 parameters', () => {
      const invalidFormat = parameterRegistry.validate('center', [180], 'CYLINDRICAL')
      expect(invalidFormat.isValid).toBe(false)
      expect(invalidFormat.error).toContain('must be an array of 2 numbers')

      const outOfRange = parameterRegistry.validate('center', [-200, 100], 'CYLINDRICAL')
      expect(outOfRange.isValid).toBe(false)
      expect(outOfRange.error).toContain('must be >= -180')
    })

    it('should reject invalid tuple3 parameters', () => {
      const invalidFormat = parameterRegistry.validate('rotate', [180], 'CONIC')
      expect(invalidFormat.isValid).toBe(false)
      expect(invalidFormat.error).toContain('must be an array of 2 or 3 numbers')

      const outOfRange = parameterRegistry.validate('rotate', [-200, 100, 0], 'CONIC')
      expect(outOfRange.isValid).toBe(false)
      expect(outOfRange.error).toContain('must be >= -180')
    })

    it('should return validation errors for multiple invalid parameters', () => {
      const params = {
        scaleMultiplier: 0.005, // Too low (below 0.01)
        center: [-200, 100] as [number, number], // Out of range
      }

      const results = parameterRegistry.validateParameters(params, 'CYLINDRICAL')
      const errors = results.filter(r => !r.isValid)
      expect(errors.length).toBeGreaterThan(0)

      // Should have error for scaleMultiplier
      const scaleError = errors.find(e => e.error?.includes('scaleMultiplier'))
      expect(scaleError).toBeDefined()
    })

    it('should handle unknown parameters', () => {
      const result = parameterRegistry.validate('unknownParam', 123, 'CYLINDRICAL')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unknown parameter: unknownParam')
    })
  })

  describe('default values', () => {
    it('should return default parameters for territory and family', () => {
      const mockTerritory = {
        code: createTerritoryCode('TEST'),
        name: 'Test Territory',
        center: [0, 0] as [number, number],
        referenceScale: 1000,
        offset: [0, 0] as [number, number],
        bounds: [[-10, -10], [10, 10]] as [[number, number], [number, number]],
      }

      const defaults = parameterRegistry.getDefaults(mockTerritory, 'CYLINDRICAL')
      expect(defaults).toBeDefined()
      expect(defaults.scaleMultiplier).toBe(1.0)
      expect(defaults.center).toEqual([0, 0])
    })
  })

  describe('completeness validation', () => {
    it('should validate that all required parameters are registered', () => {
      const errors = parameterRegistry.validateCompleteness()
      expect(errors).toHaveLength(0) // No missing parameters
    })
  })
})
