/**
 * Parameter Registry Tests - New Implementation
 */

import type { ParameterDefinition } from '../parameter-registry'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { ParameterIssue } from '@/core/types/errors'

import { beforeEach, describe, expect, it } from 'vitest'

import { registerAllParameters } from '../parameter-definitions'
import { parameterRegistry } from '../parameter-registry'

describe('parameterRegistry', () => {
  beforeEach(() => {
    ;(parameterRegistry as any).definitions.clear()
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
      expect(constraints.min).toBe(0)
      expect(constraints.max).toBe(Number.POSITIVE_INFINITY)
      expect(constraints.minExclusive).toBe(true)
    })

    it('should return empty constraints for unknown parameter', () => {
      const constraints = parameterRegistry.getConstraintsForFamily('unknown', 'CYLINDRICAL')
      expect(constraints.relevant).toBe(false)
      expect(constraints.required).toBe(false)
    })
  })

  describe('parameter validation', () => {
    const issueOf = (key: string, value: unknown, family: ProjectionFamilyType): ParameterIssue | undefined => {
      const result = parameterRegistry.validate(key, value, family)
      return result.ok ? undefined : result.error
    }

    const cases = {
      PARAMETER_REQUIRED: {
        issue: () => issueOf('projectionId', null, 'CYLINDRICAL'),
        expected: { code: 'PARAMETER_REQUIRED', parameter: 'projectionId' },
      },
      PARAMETER_NOT_NUMBER: {
        issue: () => issueOf('scaleMultiplier', 'invalid', 'CYLINDRICAL'),
        expected: { code: 'PARAMETER_NOT_NUMBER', parameter: 'scaleMultiplier' },
      },
      PARAMETER_NOT_PAIR: {
        issue: () => issueOf('center', [180], 'CYLINDRICAL'),
        expected: { code: 'PARAMETER_NOT_PAIR', parameter: 'center' },
      },
      PARAMETER_NOT_PAIR_OR_TRIPLE: {
        issue: () => issueOf('rotate', [180], 'CONIC'),
        expected: { code: 'PARAMETER_NOT_PAIR_OR_TRIPLE', parameter: 'rotate' },
      },
      PARAMETER_ITEMS_NOT_NUMBERS: {
        issue: () => issueOf('center', ['a', 'b'], 'CYLINDRICAL'),
        expected: { code: 'PARAMETER_ITEMS_NOT_NUMBERS', parameter: 'center' },
      },
      PARAMETER_NOT_ABOVE: {
        issue: () => issueOf('scaleMultiplier', 0, 'CYLINDRICAL'),
        expected: { code: 'PARAMETER_NOT_ABOVE', parameter: 'scaleMultiplier', min: 0 },
      },
      PARAMETER_TOO_LARGE: {
        issue: () => issueOf('clipAngle', 200, 'AZIMUTHAL'),
        expected: { code: 'PARAMETER_TOO_LARGE', parameter: 'clipAngle', max: 180 },
      },
      PARAMETER_ITEM_TOO_SMALL: {
        issue: () => issueOf('center', [-200, 0], 'CYLINDRICAL'),
        expected: { code: 'PARAMETER_ITEM_TOO_SMALL', parameter: 'center', position: 1, min: -180 },
      },
      PARAMETER_ITEM_TOO_LARGE: {
        issue: () => issueOf('rotate', [0, 100, 0], 'CONIC'),
        expected: { code: 'PARAMETER_ITEM_TOO_LARGE', parameter: 'rotate', position: 2, max: 90 },
      },
      PARAMETER_OUT_OF_RANGE: {
        issue: () => issueOf('parallels', [-100, 100], 'CONIC'),
        expected: { code: 'PARAMETER_OUT_OF_RANGE', parameter: 'parallels', min: -90, max: 90 },
      },
      PARAMETER_PARALLELS_ORDER: {
        issue: () => issueOf('parallels', [60, 30], 'CONIC'),
        expected: { code: 'PARAMETER_PARALLELS_ORDER', parameter: 'parallels' },
      },
    } satisfies { [C in ParameterIssue['code']]: { issue: () => ParameterIssue | undefined, expected: Extract<ParameterIssue, { code: C }> } }

    it.each(Object.entries(cases))('gives %s for the value that breaks its rule', (_code, { issue, expected }) => {
      expect(issue()).toEqual(expected)
    })

    it('accepts a valid number', () => {
      expect(parameterRegistry.validate('scaleMultiplier', 1.5, 'CYLINDRICAL').ok).toBe(true)
    })

    it('lists the issues of the relevant parameters', () => {
      const issues = parameterRegistry.validateParameters({
        scaleMultiplier: 0,
        center: [-200, 100] as [number, number],
        clipAngle: 'not relevant for this family' as unknown as number,
      }, 'CYLINDRICAL')

      expect(issues.map(issue => issue.parameter)).toEqual(['scaleMultiplier', 'center'])
    })

    it('throws for a parameter without definition', () => {
      expect(() => parameterRegistry.validate('unknownParam', 123, 'CYLINDRICAL')).toThrow('Unknown parameter: unknownParam')
    })
  })
})

describe('domains and default values of the registered parameters', () => {
  const FAMILIES = ['CYLINDRICAL', 'PSEUDOCYLINDRICAL', 'CONIC', 'AZIMUTHAL', 'POLYHEDRAL', 'POLYCONIC', 'MISCELLANEOUS'] as const
  const asArray = (value: unknown) => (Array.isArray(value) ? value : [value]) as number[]

  registerAllParameters()
  const axes = parameterRegistry.getAll().flatMap(definition => FAMILIES.flatMap((family) => {
    const controls = parameterRegistry.getAxisControls(definition.key as string, family)
    return controls && definition.defaultValue !== undefined
      ? [{ name: `${String(definition.key)} of ${family}`, controls, defaultValue: asArray(definition.defaultValue) }]
      : []
  }))

  beforeEach(registerAllParameters)

  it.each(axes)('$name holds its default value in its domain', ({ controls, defaultValue }) => {
    controls.forEach(({ domain }, axis) => {
      const value = defaultValue[axis]!
      expect(domain.minExclusive ? value > domain.min : value >= domain.min).toBe(true)
      expect(value).toBeLessThanOrEqual(domain.max)
    })
  })

  it('reads the default value of a parameter', () => {
    expect(parameterRegistry.getDefaultValue('parallels')).toEqual([30, 60])
    expect(parameterRegistry.getDefaultValue('clipAngle')).toBe(90)
    expect(parameterRegistry.getDefaultValue('precision')).toBe(0.1)
    expect(parameterRegistry.getDefaultValue('pixelClipExtent')).toEqual([-100, -100, 100, 100])
  })

  it('throws for a parameter without default value', () => {
    expect(() => parameterRegistry.getDefaultValue('projectionId')).toThrow(Error)
  })
})
