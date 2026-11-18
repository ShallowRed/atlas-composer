import type { ProjectionFamilyType } from '@/core/projections/types'
import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { parameterRegistry, roundToFormat, toDomain } from '@/core/parameters'
import { projectionRegistry } from '@/core/projections/registry'

interface PresetValue {
  name: string
  family: ProjectionFamilyType
  key: string
  values: number[]
}

// Parameters of a projection and of a layout, wherever a preset type writes them; the application ignores those that the family does not use
function valuesOf(name: string, projectionId: string, family: ProjectionFamilyType | undefined, parameters: Record<string, unknown>): PresetValue[] {
  const resolvedFamily = family ?? projectionRegistry.get(projectionId)?.family
  return resolvedFamily
    ? Object.entries(parameters)
        .filter(([key]) => parameterRegistry.getConstraintsForFamily(key, resolvedFamily).relevant)
        .filter(([, value]) => typeof value === 'number' || (Array.isArray(value) && value.every(item => typeof item === 'number')))
        .map(([key, value]) => ({ name, family: resolvedFamily, key, values: ([] as number[]).concat(value as number | number[]) }))
    : []
}

const presetValues = readPresetFiles().flatMap(({ path, json }): PresetValue[] => {
  const preset = JSON.parse(json)
  if (Array.isArray(preset.territories)) {
    return preset.territories.flatMap((territory: any) => valuesOf(
      `${path} ${territory.code}`,
      territory.projection.id,
      territory.projection.family,
      { ...territory.projection.parameters, ...territory.layout },
    ))
  }
  if (preset.config?.projection) {
    return valuesOf(path, preset.config.projection.id, undefined, preset.config.projection.parameters ?? {})
  }
  return Object.entries(preset.config?.territories ?? {}).flatMap(([code, territory]: [string, any]) =>
    valuesOf(`${path} ${code}`, territory.projection.id, undefined, territory.projection.parameters ?? {}))
})

describe('domains of the axes and values of the presets', () => {
  it('finds values to check', () => {
    expect(presetValues.length).toBeGreaterThan(100)
  })

  it.each(presetValues)('$name: $key lies in the domain and the writing of its axes', ({ family, key, values }) => {
    const controls = parameterRegistry.getAxisControls(key, family)
    expect(controls, `${key} has no control for ${family}`).toBeDefined()
    values.forEach((value, axis) => {
      const { domain, format } = controls![axis]!
      expect(roundToFormat(value, format)).toBe(value)
      expect(toDomain(value, domain, format)).toBe(domain.cyclic && value === domain.max ? domain.min : value)
    })
  })
})
