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
    const { min, max } = parameterRegistry.get(key)!.familyConstraints![family]!
    expect(controls).toHaveLength(count)
    controls!.forEach((control, axis) => {
      expect(control.domain.min).toBe(Array.isArray(min) ? min[axis] : min)
      expect(control.domain.max).toBe(Array.isArray(max) ? max[axis] : max)
      expect(control.step).toBeGreaterThan(0)
    })
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
