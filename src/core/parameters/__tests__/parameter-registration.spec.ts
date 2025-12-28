/**
 * Parameter Registration Tests
 *
 * Tests for the complete parameter registration system
 */

import { describe, expect, it } from 'vitest'
import { createTerritoryCode } from '@/types/branded'

import { parameterRegistry } from '../index'

describe('parameter registration system', () => {
  it('should have all required parameters registered', () => {
    // Test completeness
    const completenessResults = parameterRegistry.validateCompleteness()
    const errors = completenessResults.filter(r => !r.isValid)

    if (errors.length > 0) {
      console.log('Missing parameters:', errors.map(e => e.error))
    }

    expect(errors).toHaveLength(0)
  })

  it('should have all core positioning parameters', () => {
    expect(parameterRegistry.get('center')).toBeDefined()
    expect(parameterRegistry.get('rotate')).toBeDefined()
    expect(parameterRegistry.get('parallels')).toBeDefined()
  })

  it('should have all scale parameters', () => {
    expect(parameterRegistry.get('scaleMultiplier')).toBeDefined()
    // scale and baseScale are deprecated and removed
    expect(parameterRegistry.get('scale')).toBeUndefined()
    expect(parameterRegistry.get('baseScale')).toBeUndefined()
  })

  it('should have all translation parameters', () => {
    // Note: 'translate' is a D3 internal parameter, not registered in our registry
    // Only translateOffset is registered for preset-based layout positioning
    expect(parameterRegistry.get('translateOffset')).toBeDefined()
  })

  it('should have all advanced parameters', () => {
    expect(parameterRegistry.get('clipAngle')).toBeDefined()
    expect(parameterRegistry.get('precision')).toBeDefined()
  })

  it('should have proper relevance mapping for projection families', () => {
    // CONIC projections should use rotate and parallels, not center
    const conicRelevant = parameterRegistry.getRelevant('CONIC')
    const conicKeys = conicRelevant.map(p => p.key)

    expect(conicKeys).toContain('rotate')
    expect(conicKeys).toContain('parallels')
    expect(conicKeys).not.toContain('center') // center is not relevant for conic

    // AZIMUTHAL projections should use center, not parallels
    const azimuthalRelevant = parameterRegistry.getRelevant('AZIMUTHAL')
    const azimuthalKeys = azimuthalRelevant.map(p => p.key)

    expect(azimuthalKeys).toContain('center')
    expect(azimuthalKeys).toContain('clipAngle') // specific to azimuthal
    expect(azimuthalKeys).not.toContain('parallels') // parallels not relevant for azimuthal
  })

  it('should have proper export/require configuration', () => {
    const exportable = parameterRegistry.getExportable()
    const required = parameterRegistry.getRequired()

    // Core parameters should be exportable (except deprecated scale parameters)
    const exportableKeys = exportable.map(p => p.key)
    expect(exportableKeys).toContain('center')
    expect(exportableKeys).toContain('rotate')
    expect(exportableKeys).toContain('parallels')
    // scale and baseScale are deprecated and should NOT be exportable
    expect(exportableKeys).not.toContain('scale')
    expect(exportableKeys).not.toContain('baseScale')
    // Only scaleMultiplier should be exportable for scale adjustments
    expect(exportableKeys).toContain('scaleMultiplier')
    expect(exportableKeys).toContain('translateOffset')
    // Note: 'translate' is D3 internal, not in our registry
    expect(exportableKeys).toContain('clipAngle')
    expect(exportableKeys).toContain('precision')

    // Essential preset parameters should be required
    const requiredKeys = required.map(p => p.key)
    expect(requiredKeys).toContain('center')
    expect(requiredKeys).toContain('rotate')
    expect(requiredKeys).toContain('parallels')
    expect(requiredKeys).toContain('scaleMultiplier')
    expect(requiredKeys).toContain('translateOffset')

    // Optional parameters should not be required
    expect(requiredKeys).not.toContain('clipAngle') // has default
    expect(requiredKeys).not.toContain('precision') // has default
  })

  describe('parameter constraint validation', () => {
    it('should validate center parameter correctly', () => {
      const centerDef = parameterRegistry.get('center')!
      expect(centerDef.type).toBe('tuple2')
      expect(centerDef.unit).toBe('degrees')

      // Valid center
      const validResult = parameterRegistry.validate('center', [2.0, 46.5], 'AZIMUTHAL')
      expect(validResult.isValid).toBe(true)

      // Invalid longitude
      const invalidLon = parameterRegistry.validate('center', [-200, 46.5], 'AZIMUTHAL')
      expect(invalidLon.isValid).toBe(false)
    })

    it('should validate rotate parameter correctly', () => {
      const rotateDef = parameterRegistry.get('rotate')!
      expect(rotateDef.type).toBe('tuple3')
      expect(rotateDef.unit).toBe('degrees')

      // Valid rotation (3 elements)
      const valid3 = parameterRegistry.validate('rotate', [-3, -46.2, 0], 'CONIC')
      expect(valid3.isValid).toBe(true)

      // Valid rotation (2 elements, gamma optional)
      const valid2 = parameterRegistry.validate('rotate', [-3, -46.2], 'CONIC')
      expect(valid2.isValid).toBe(true)

      // Invalid rotation (1 element)
      const invalid = parameterRegistry.validate('rotate', [-3], 'CONIC')
      expect(invalid.isValid).toBe(false)
    })

    it('should validate scale parameters correctly', () => {
      // Scale multiplier (only remaining scale parameter)
      const validMult = parameterRegistry.validate('scaleMultiplier', 1.5, 'CYLINDRICAL')
      expect(validMult.isValid).toBe(true)

      const invalidMult = parameterRegistry.validate('scaleMultiplier', 15, 'CYLINDRICAL')
      expect(invalidMult.isValid).toBe(false)

      // Deprecated parameters should return unknown parameter error
      const baseScaleResult = parameterRegistry.validate('baseScale', 2700, 'CYLINDRICAL')
      expect(baseScaleResult.isValid).toBe(false)
      expect(baseScaleResult.error).toContain('Unknown parameter')
    })

    it('should validate clipAngle relevance correctly', () => {
      // Relevant for azimuthal projections
      const azimuthalResult = parameterRegistry.validate('clipAngle', 90, 'AZIMUTHAL')
      expect(azimuthalResult.isValid).toBe(true)
      expect(azimuthalResult.warning).toBeUndefined()

      // Not relevant for cylindrical projections
      const cylindricalResult = parameterRegistry.validate('clipAngle', 90, 'CYLINDRICAL')
      expect(cylindricalResult.isValid).toBe(true)
      expect(cylindricalResult.warning).toContain('not relevant')
    })
  })

  describe('default value generation', () => {
    it('should provide defaults for optional parameters', () => {
      const mockTerritory = {
        code: createTerritoryCode('TEST'),
        name: 'Test Territory',
        center: [0, 0] as [number, number],
        offset: [0, 0] as [number, number],
        bounds: [[0, 0], [100, 100]] as [[number, number], [number, number]],
      }

      const cylindricalDefaults = parameterRegistry.getDefaults(mockTerritory, 'CYLINDRICAL')

      // Should have defaults for optional parameters relevant to CYLINDRICAL
      expect(cylindricalDefaults.translateOffset).toEqual([0, 0])
      expect(cylindricalDefaults.precision).toBe(0.1)

      // Test AZIMUTHAL-specific defaults
      const azimuthalDefaults = parameterRegistry.getDefaults(mockTerritory, 'AZIMUTHAL')
      expect(azimuthalDefaults.clipAngle).toBe(90)

      // Should have default for scaleMultiplier (available to all families)
      expect(cylindricalDefaults.scaleMultiplier).toBe(1.0)
    })
  })

  it('should have correct parameter mutability settings', () => {
    // User-editable parameters
    expect(parameterRegistry.get('center')?.mutable).toBe(true)
    expect(parameterRegistry.get('rotate')?.mutable).toBe(true)
    expect(parameterRegistry.get('scaleMultiplier')?.mutable).toBe(true)
    expect(parameterRegistry.get('translateOffset')?.mutable).toBe(true)
  })

  it('should have correct parameter sources', () => {
    // Preset parameters
    expect(parameterRegistry.get('center')?.source).toBe('preset')
    expect(parameterRegistry.get('scaleMultiplier')?.source).toBe('preset')
    expect(parameterRegistry.get('translateOffset')?.source).toBe('preset')

    // Deprecated parameters should no longer be registered
    expect(parameterRegistry.get('scale')).toBeUndefined()
    expect(parameterRegistry.get('baseScale')).toBeUndefined()
  })
})
