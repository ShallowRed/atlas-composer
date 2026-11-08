/**
 * Parameter Registration Tests
 *
 * Tests for the complete parameter registration system
 */

import { describe, expect, it } from 'vitest'

import { parameterRegistry } from '../index'

describe('parameter registration system', () => {
  it('should register the projection identifier', () => {
    expect(parameterRegistry.get('projectionId')).toBeDefined()
  })

  it('should have all core positioning parameters', () => {
    expect(parameterRegistry.get('center')).toBeDefined()
    expect(parameterRegistry.get('rotate')).toBeDefined()
    expect(parameterRegistry.get('parallels')).toBeDefined()
  })

  it('should have all scale parameters', () => {
    expect(parameterRegistry.get('scaleMultiplier')).toBeDefined()
    expect(parameterRegistry.get('scale')).toBeUndefined()
    expect(parameterRegistry.get('baseScale')).toBeUndefined()
  })

  it('should have all translation parameters', () => {
    expect(parameterRegistry.get('translateOffset')).toBeDefined()
  })

  it('should have all advanced parameters', () => {
    expect(parameterRegistry.get('clipAngle')).toBeDefined()
    expect(parameterRegistry.get('precision')).toBeDefined()
  })

  it('should have proper relevance mapping for projection families', () => {
    const conicRelevant = parameterRegistry.getRelevant('CONIC')
    const conicKeys = conicRelevant.map(p => p.key)

    expect(conicKeys).toContain('rotate')
    expect(conicKeys).toContain('parallels')
    expect(conicKeys).not.toContain('center')

    const azimuthalRelevant = parameterRegistry.getRelevant('AZIMUTHAL')
    const azimuthalKeys = azimuthalRelevant.map(p => p.key)

    expect(azimuthalKeys).toContain('rotate')
    expect(azimuthalKeys).not.toContain('center')
    expect(azimuthalKeys).toContain('clipAngle') // specific to azimuthal
    expect(azimuthalKeys).not.toContain('parallels') // parallels not relevant for azimuthal

    const cylindricalKeys = parameterRegistry.getRelevant('CYLINDRICAL').map(p => p.key)

    expect(cylindricalKeys).toContain('center')
    expect(cylindricalKeys).toContain('rotate')
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
      expect(validResult.ok).toBe(true)

      // Invalid longitude
      const invalidLon = parameterRegistry.validate('center', [-200, 46.5], 'AZIMUTHAL')
      expect(invalidLon.ok).toBe(false)
    })

    it('should validate rotate parameter correctly', () => {
      const rotateDef = parameterRegistry.get('rotate')!
      expect(rotateDef.type).toBe('tuple3')
      expect(rotateDef.unit).toBe('degrees')

      // Valid rotation (3 elements)
      const valid3 = parameterRegistry.validate('rotate', [-3, -46.2, 0], 'CONIC')
      expect(valid3.ok).toBe(true)

      // Valid rotation (2 elements, gamma optional)
      const valid2 = parameterRegistry.validate('rotate', [-3, -46.2], 'CONIC')
      expect(valid2.ok).toBe(true)

      // Invalid rotation (1 element)
      const invalid = parameterRegistry.validate('rotate', [-3], 'CONIC')
      expect(invalid.ok).toBe(false)
    })

    it('should validate scale parameters correctly', () => {
      // Scale multiplier (only remaining scale parameter)
      const validMult = parameterRegistry.validate('scaleMultiplier', 1.5, 'CYLINDRICAL')
      expect(validMult.ok).toBe(true)

      const invalidMult = parameterRegistry.validate('scaleMultiplier', 15, 'CYLINDRICAL')
      expect(invalidMult.ok).toBe(false)

      expect(() => parameterRegistry.validate('baseScale', 2700, 'CYLINDRICAL')).toThrow('Unknown parameter')
    })

    it('should validate clipAngle relevance correctly', () => {
      // Relevant for azimuthal projections
      const azimuthalResult = parameterRegistry.validate('clipAngle', 90, 'AZIMUTHAL')
      expect(azimuthalResult.ok).toBe(true)

      // Not relevant for cylindrical projections
      const cylindricalResult = parameterRegistry.validate('clipAngle', 90, 'CYLINDRICAL')
      expect(cylindricalResult.ok).toBe(true)
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
