import { describe, expect, it } from 'vitest'
import { ProjectionFamily } from '@/core/projections/types'
import { parameterRegistry } from '../index'

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

describe('control of each axis of a parameter', () => {
  it('finds numeric parameters to check', () => {
    expect(numericAxes.length).toBeGreaterThan(0)
  })

  it.each(numericAxes)('gives a control to each axis of $key for the family $family', ({ key, family, count }) => {
    const controls = parameterRegistry.getAxisControls(key, family)
    expect(controls).toHaveLength(count)
    for (const control of controls!) {
      expect(control.kind).toBeTruthy()
      expect(control.step).toBeGreaterThan(0)
      expect(control.format).toBeTruthy()
      expect(control.domain.min).toBeLessThan(control.domain.max)
    }
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
