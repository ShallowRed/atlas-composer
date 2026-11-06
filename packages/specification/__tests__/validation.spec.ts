import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  isCompositeProjectionConfig,
  SPECIFICATION_VERSION,
  validateConfig,
  validateVersion,
} from '../src'

const minimal = JSON.parse(readFileSync('packages/specification/__tests__/fixtures/valid/minimal.json', 'utf8'))

describe('validateConfig', () => {
  it('names the missing property in the path', () => {
    const config = structuredClone(minimal)
    delete config.metadata

    expect(validateConfig(config).errors).toEqual([
      { path: 'metadata', message: 'must have required property \'metadata\'', code: 'MISSING_FIELD' },
    ])
  })

  it('names the unknown parameter in the path', () => {
    const config = structuredClone(minimal)
    config.territories[0].projection.parameters.foo = 1

    expect(validateConfig(config).errors).toEqual([
      { path: 'territories[0].projection.parameters.foo', message: 'must NOT have additional properties', code: 'INVALID_VALUE' },
    ])
  })

  it('reports a value of the wrong type', () => {
    const config = { ...minimal, referenceScale: '2700' }

    expect(validateConfig(config).errors).toEqual([
      { path: 'referenceScale', message: 'must be number', code: 'INVALID_TYPE' },
    ])
  })

  it('reports a territory code outside the pattern', () => {
    const config = structuredClone(minimal)
    config.territories[0].code = 'TEST'

    expect(validateConfig(config).errors).toEqual([
      expect.objectContaining({ path: 'territories[0].code', code: 'INVALID_VALUE' }),
    ])
  })

  it('reports a version of another major', () => {
    expect(validateConfig({ ...minimal, version: '2.0' }).errors).toEqual([
      expect.objectContaining({ path: 'version', code: 'VERSION_UNSUPPORTED' }),
    ])
  })

  it('reports the second territory of a duplicate code', () => {
    const config = structuredClone(minimal)
    config.territories.push(structuredClone(config.territories[0]))

    expect(validateConfig(config)).toEqual({
      valid: false,
      errors: [{ path: 'territories[1].code', message: 'Duplicate territory code: FR-GP', code: 'INVALID_VALUE' }],
      warnings: [],
    })
  })

  it('accepts the format version it writes', () => {
    expect(validateConfig({ ...minimal, version: SPECIFICATION_VERSION }).valid).toBe(true)
  })
})

describe('validateVersion', () => {
  it.each(['1.0', '1.1', '1.12'])('accepts %s', (version) => {
    expect(validateVersion(version)).toBe(true)
  })

  it.each(['2.0', '0.9', '1', '1.0.0'])('refuses %s', (version) => {
    expect(validateVersion(version)).toBe(false)
  })
})

describe('isCompositeProjectionConfig', () => {
  it('applies the whole schema', () => {
    expect(isCompositeProjectionConfig(minimal)).toBe(true)
    expect(isCompositeProjectionConfig({ ...minimal, unknown: true })).toBe(false)
  })
})
