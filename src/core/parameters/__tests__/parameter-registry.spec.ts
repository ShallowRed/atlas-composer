/**
 * Parameter Registry Tests
 */

import type { ParameterDefinition } from '../parameter-registry'

import { beforeEach, describe, expect, it } from 'vitest'

import { ParameterRegistry } from '../parameter-registry'

describe('parameterRegistry', () => {
  let registry: ParameterRegistry

  beforeEach(() => {
    registry = new ParameterRegistry()
  })

  describe('parameter registration', () => {
    it('should register a parameter definition', () => {
      const def: ParameterDefinition = {
        key: 'scale',
        displayName: 'Scale',
        description: 'Scale factor',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: 100, max: 10000 },
        relevantFor: 'all'
      }

      registry.register(def)
      expect(registry.get('scale')).toEqual(def)
    })

    it('should return undefined for unregistered parameters', () => {
      expect(registry.get('unknown')).toBeUndefined()
    })

    it('should return all registered parameters', () => {
      const def1: ParameterDefinition = {
        key: 'scale',
        displayName: 'Scale',
        description: 'Scale factor',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: 100, max: 10000 },
        relevantFor: 'all'
      }

      const def2: ParameterDefinition = {
        key: 'center',
        displayName: 'Center',
        description: 'Center point',
        type: 'tuple2',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: [-180, -90], max: [180, 90] },
        relevantFor: ['CYLINDRICAL']
      }

      registry.register(def1)
      registry.register(def2)

      const all = registry.getAll()
      expect(all).toHaveLength(2)
      expect(all).toContainEqual(def1)
      expect(all).toContainEqual(def2)
    })
  })

  describe('parameter filtering', () => {
    beforeEach(() => {
      registry.register({
        key: 'scale',
        displayName: 'Scale',
        description: 'Scale factor',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: 100, max: 10000 },
        relevantFor: 'all'
      })

      registry.register({
        key: 'center',
        displayName: 'Center',
        description: 'Center point',
        type: 'tuple2',
        source: 'preset',
        mutable: true,
        exportable: false, // Not exportable
        requiresPreset: true,
        constraints: { min: [-180, -90], max: [180, 90] },
        relevantFor: ['CYLINDRICAL']
      })

      registry.register({
        key: 'clipAngle',
        displayName: 'Clip Angle',
        description: 'Clipping angle',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: false, // Not required
        constraints: { min: 0, max: 180 },
        relevantFor: ['AZIMUTHAL']
      })
    })

    it('should return exportable parameters', () => {
      const exportable = registry.getExportable()
      expect(exportable).toHaveLength(2)
      expect(exportable.map(d => d.key)).toEqual(['scale', 'clipAngle'])
    })

    it('should return required parameters', () => {
      const required = registry.getRequired()
      expect(required).toHaveLength(2)
      expect(required.map(d => d.key)).toEqual(['scale', 'center'])
    })

    it('should return parameters relevant for projection family', () => {
      const cylindrical = registry.getRelevant('CYLINDRICAL')
      expect(cylindrical).toHaveLength(2) // scale (all) + center (cylindrical)
      expect(cylindrical.map(d => d.key)).toContain('scale')
      expect(cylindrical.map(d => d.key)).toContain('center')

      const azimuthal = registry.getRelevant('AZIMUTHAL')
      expect(azimuthal).toHaveLength(2) // scale (all) + clipAngle (azimuthal)
      expect(azimuthal.map(d => d.key)).toContain('scale')
      expect(azimuthal.map(d => d.key)).toContain('clipAngle')
    })
  })

  describe('parameter validation', () => {
    beforeEach(() => {
      registry.register({
        key: 'scale',
        displayName: 'Scale',
        description: 'Scale factor',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: 100, max: 10000 },
        relevantFor: 'all'
      })

      registry.register({
        key: 'center',
        displayName: 'Center',
        description: 'Center point',
        type: 'tuple2',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: [-180, -90], max: [180, 90] },
        relevantFor: ['CYLINDRICAL']
      })

      registry.register({
        key: 'rotate',
        displayName: 'Rotate',
        description: 'Rotation angles',
        type: 'tuple3',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: [-180, -90, -180], max: [180, 90, 180] },
        relevantFor: ['CONIC']
      })

      registry.register({
        key: 'clipAngle',
        displayName: 'Clip Angle',
        description: 'Clipping angle',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: false,
        constraints: (family) => ({
          min: 0,
          max: 180,
          relevant: family === 'AZIMUTHAL'
        }),
        relevantFor: ['AZIMUTHAL']
      })
    })

    it('should validate valid number parameters', () => {
      const result = registry.validate('scale', 5000, 'CYLINDRICAL')
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid number parameters', () => {
      const tooLow = registry.validate('scale', 50, 'CYLINDRICAL')
      expect(tooLow.isValid).toBe(false)
      expect(tooLow.error).toContain('must be >= 100')

      const tooHigh = registry.validate('scale', 20000, 'CYLINDRICAL')
      expect(tooHigh.isValid).toBe(false)
      expect(tooHigh.error).toContain('must be <= 10000')

      const notNumber = registry.validate('scale', 'invalid', 'CYLINDRICAL')
      expect(notNumber.isValid).toBe(false)
      expect(notNumber.error).toContain('must be a valid number')
    })

    it('should validate valid tuple2 parameters', () => {
      const result = registry.validate('center', [2.0, 46.5], 'CYLINDRICAL')
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid tuple2 parameters', () => {
      const wrongLength = registry.validate('center', [2.0], 'CYLINDRICAL')
      expect(wrongLength.isValid).toBe(false)
      expect(wrongLength.error).toContain('must be an array of 2 numbers')

      const outOfRange = registry.validate('center', [-200, 46.5], 'CYLINDRICAL')
      expect(outOfRange.isValid).toBe(false)
      expect(outOfRange.error).toContain('must be >= -180')
    })

    it('should validate valid tuple3 parameters', () => {
      const result = registry.validate('rotate', [-3, -46.2, 0], 'CONIC')
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid tuple3 parameters', () => {
      const wrongLength = registry.validate('rotate', [-3], 'CONIC')
      expect(wrongLength.isValid).toBe(false)
      expect(wrongLength.error).toContain('must be an array of 2 or 3 numbers')

      const outOfRange = registry.validate('rotate', [-200, -46.2, 0], 'CONIC')
      expect(outOfRange.isValid).toBe(false)
      expect(outOfRange.error).toContain('must be >= -180')
    })

    it('should handle dynamic constraints based on projection family', () => {
      // clipAngle is relevant for AZIMUTHAL
      const valid = registry.validate('clipAngle', 90, 'AZIMUTHAL')
      expect(valid.isValid).toBe(true)

      // clipAngle is not relevant for CYLINDRICAL
      const irrelevant = registry.validate('clipAngle', 90, 'CYLINDRICAL')
      expect(irrelevant.isValid).toBe(true)
      expect(irrelevant.warning).toContain('not relevant')
    })

    it('should reject unknown parameters', () => {
      const result = registry.validate('unknown', 123, 'CYLINDRICAL')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unknown parameter')
    })

    it('should validate multiple parameters', () => {
      const params = {
        scale: 5000,
        center: [2.0, 46.5] as [number, number]
      }

      const results = registry.validateParameters(params, 'CYLINDRICAL')
      expect(results.filter(r => !r.isValid)).toHaveLength(0)
    })

    it('should return validation errors for multiple invalid parameters', () => {
      const params = {
        scale: 50, // too low
        center: [-200, 46.5] as [number, number] // longitude too low
      }

      const results = registry.validateParameters(params, 'CYLINDRICAL')
      const errors = results.filter(r => !r.isValid)
      expect(errors).toHaveLength(2)
      expect(errors[0]?.error).toContain('scale')
      expect(errors[1]?.error).toContain('center')
    })
  })

  describe('default parameter generation', () => {
    beforeEach(() => {
      registry.register({
        key: 'scale',
        displayName: 'Scale',
        description: 'Scale factor',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: 100, max: 10000 },
        relevantFor: 'all',
        defaultValue: 2700
      })

      registry.register({
        key: 'translate',
        displayName: 'Translation',
        description: 'Translation offset',
        type: 'tuple2',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: false,
        constraints: { min: [-1000, -1000], max: [1000, 1000] },
        relevantFor: 'all',
        computeDefault: () => [0, 0]
      })
    })

    it('should generate defaults with static values', () => {
      const mockTerritory = {
        code: 'FR-MET',
        name: 'France Metropolitaine',
        center: [2.0, 46.5] as [number, number],
        offset: [0, 0] as [number, number],
        bounds: [[0, 0], [100, 100]] as [[number, number], [number, number]]
      }

      const defaults = registry.getDefaults(mockTerritory, 'CYLINDRICAL')
      expect(defaults.scale).toBe(2700)
      expect(defaults.translate).toEqual([0, 0])
    })
  })

  describe('completeness validation', () => {
    it('should detect missing parameter definitions', () => {
      // Register only some parameters
      registry.register({
        key: 'scale',
        displayName: 'Scale',
        description: 'Scale factor',
        type: 'number',
        source: 'preset',
        mutable: true,
        exportable: true,
        requiresPreset: true,
        constraints: { min: 100, max: 10000 },
        relevantFor: 'all'
      })

      const results = registry.validateCompleteness()
      const errors = results.filter(r => !r.isValid)
      expect(errors.length).toBeGreaterThan(0) // Should find missing parameters
      expect(errors.some(e => e.error?.includes('center'))).toBe(true)
    })
  })
})