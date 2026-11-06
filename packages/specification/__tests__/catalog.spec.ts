import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCALE_MULTIPLIER,
  PROJECTION_FAMILIES,
  PROJECTION_PARAMETER_KEYS,
  resolveProjectionAlias,
} from '../src'

const { definitions } = JSON.parse(readFileSync('packages/specification/schemas/definitions.schema.json', 'utf8'))

describe('resolveProjectionAlias', () => {
  it.each([
    ['albers', 'conic-equal-area'],
    ['natural-earth-1', 'natural-earth'],
    ['conic-equal-area', 'conic-equal-area'],
    ['unknown-projection', 'unknown-projection'],
  ])('resolves %s to %s', (id, resolved) => {
    expect(resolveProjectionAlias(id)).toBe(resolved)
  })
})

describe('constants read from the schema', () => {
  it('lists the families and the parameters of the schema', () => {
    expect(PROJECTION_FAMILIES).toEqual(definitions.projectionFamily.enum)
    expect(PROJECTION_PARAMETER_KEYS).toEqual(Object.keys(definitions.projectionParameters.properties))
  })

  it('takes the default scale multiplier of the schema', () => {
    expect(DEFAULT_SCALE_MULTIPLIER).toBe(definitions.projectionParameters.properties.scaleMultiplier.default)
  })
})
