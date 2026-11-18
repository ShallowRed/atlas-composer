import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ProjectionFamily } from '@/core/projections/types'
import { CANVAS_LENGTH_CONTROL, parameterRegistry, REFERENCE_SCALE_CONTROL } from '../index'

// A numeric parameter has a number or an array of numbers as default value
function axisCount(defaultValue: unknown): number | null {
  if (typeof defaultValue === 'number') {
    return 1
  }
  return Array.isArray(defaultValue) && defaultValue.every(item => typeof item === 'number') ? defaultValue.length : null
}

const numericAxes = parameterRegistry.getAll().flatMap((definition) => {
  const count = axisCount(definition.defaultValue)
  return count === null
    ? []
    : Object.values(ProjectionFamily)
        .filter(family => definition.familyConstraints?.[family]?.relevant)
        .map(family => ({ key: definition.key as string, family, count }))
})

const KINDS = ['longitude', 'latitude', 'angle', 'ratio', 'scale', 'canvas-length', 'threshold']

describe('control of each axis of a parameter', () => {
  it('finds numeric parameters to check', () => {
    expect(numericAxes.length).toBeGreaterThan(0)
  })

  it.each(numericAxes)('gives a control to each axis of $key for the family $family', ({ key, family, count }) => {
    const controls = parameterRegistry.getAxisControls(key, family)
    const { min, max } = parameterRegistry.get(key)!.familyConstraints![family]!
    expect(controls).toHaveLength(count)
    controls!.forEach((control, axis) => {
      expect(control.domain.min).toBe(Array.isArray(min) ? min[axis] : min)
      expect(control.domain.max).toBe(Array.isArray(max) ? max[axis] : max)
      expect(control.step).toBeGreaterThan(0)
      expect(KINDS).toContain(control.kind)
      expect(Object.keys(control.format)).toHaveLength(1)
    })
  })

  it.each(numericAxes.filter(({ count }) => count === 1))('excludes the minimum of $key for the family $family', ({ key, family }) => {
    const { min, minExclusive } = parameterRegistry.get(key)!.familyConstraints![family]!
    expect(min === undefined || minExclusive).toBe(true)
  })

  it('gives the control of a parameter that the family declares without using it', () => {
    expect(parameterRegistry.getAxisControls('center', 'CONIC')).toHaveLength(2)
  })

  it('gives no control to the identifier of the projection', () => {
    expect(parameterRegistry.getAxisControls('projectionId', 'CONIC')).toBeUndefined()
  })

  it('wraps the longitudes and the roll', () => {
    const cyclic = parameterRegistry.getAxisControls('rotate', 'CONIC')!.map(control => control.domain.cyclic ?? false)
    expect(cyclic).toEqual([true, false, true])
  })
})

const definitions = JSON.parse(readFileSync('packages/specification/schemas/definitions.schema.json', 'utf8')).definitions
const composite = JSON.parse(readFileSync('packages/specification/schemas/composite-projection.schema.json', 'utf8'))

interface SchemaBounds {
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
}

// The domain lies inside the bounds of the specification
function expectInside(domain: { min: number, max: number, minExclusive?: boolean }, bounds: SchemaBounds) {
  const lowest = bounds.exclusiveMinimum ?? bounds.minimum
  if (lowest !== undefined) {
    expect(domain.min).toBeGreaterThanOrEqual(lowest)
    if (bounds.exclusiveMinimum !== undefined && domain.min === lowest) {
      expect(domain.minExclusive).toBe(true)
    }
  }
  expect(domain.max).toBeLessThanOrEqual(bounds.maximum ?? Number.POSITIVE_INFINITY)
}

describe('domains and the specification', () => {
  it.each(['scaleMultiplier', 'clipAngle', 'precision'])('keeps %s inside the bounds of the specification, its minimum excluded', (key) => {
    const [{ domain }] = parameterRegistry.getAxisControls(key, 'AZIMUTHAL')!
    expectInside(domain, definitions.projectionParameters.properties[key])
    expect(domain.minExclusive).toBe(true)
  })

  it('keeps the canvas inside the bounds of the specification', () => {
    expectInside(CANVAS_LENGTH_CONTROL.domain, definitions.canvasDimensions.properties.width)
    expectInside(CANVAS_LENGTH_CONTROL.domain, definitions.canvasDimensions.properties.height)
  })

  it('keeps the reference scale inside the bounds of the specification', () => {
    expectInside(REFERENCE_SCALE_CONTROL.domain, composite.properties.referenceScale)
  })

  it.each(['scaleMultiplier', 'clipAngle', 'precision'])('refuses %s at zero', (key) => {
    expect(parameterRegistry.validate(key, 0, 'AZIMUTHAL').ok).toBe(false)
  })
})
