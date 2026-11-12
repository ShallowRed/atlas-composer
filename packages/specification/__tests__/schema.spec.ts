import { readdirSync, readFileSync } from 'node:fs'
import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import { validateConfig } from '../src'

const SPECIFICATION = 'packages/specification'
const GENERATED = `${SPECIFICATION}/src/generated`

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function jsonFiles(folder: string) {
  return readdirSync(folder).filter(file => file.endsWith('.json')).map(file => `${folder}/${file}`)
}

// A composite-custom preset has no type field
const compositePresets = readdirSync('configs/presets')
  .flatMap(atlas => jsonFiles(`configs/presets/${atlas}`))
  .filter(path => readJson(path).type === undefined)

describe('composite projection schema', () => {
  it.each(jsonFiles(`${SPECIFICATION}/__tests__/fixtures/valid`))('accepts %s', (path) => {
    expect(validateConfig(readJson(path)).errors).toEqual([])
  })

  it.each(jsonFiles(`${SPECIFICATION}/__tests__/fixtures/invalid`))('refuses %s', (path) => {
    expect(validateConfig(readJson(path)).valid).toBe(false)
  })

  it.each(compositePresets)('accepts the preset %s', (path) => {
    expect(validateConfig(readJson(path)).errors).toEqual([])
  })

  it.each(readdirSync(GENERATED))('generates %s without importing a module', (file) => {
    const code = readFileSync(`${GENERATED}/${file}`, 'utf8')

    expect(code).not.toMatch(/\bimport\b/)
    expect(code).not.toMatch(/\brequire\s*\(/)
  })
})

describe('neutral description schema', () => {
  const validate = new Ajv()
    .addSchema(readJson(`${SPECIFICATION}/schemas/definitions.schema.json`))
    .compile(readJson(`${SPECIFICATION}/schemas/neutral-composite.schema.json`))

  const description = {
    canvasDimensions: { width: 960, height: 500 },
    referenceScale: 2700,
    territories: [{
      code: 'PT-CONT',
      pipeline: '+proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad +step +proj=merc +lon_0=0 +R=1',
      clip: [[0, 0], [960, 0], [960, 500], [0, 500], [0, 0]],
    }],
    unsupported: [{ code: 'PT-20', reason: 'symmetric-parallels' }],
    emptyClipCodes: ['PT-30'],
  }

  it('accepts a description', () => {
    expect(validate(description)).toBe(true)
  })

  it('refuses a reason outside the list', () => {
    expect(validate({ ...description, unsupported: [{ code: 'PT-20', reason: 'other' }] })).toBe(false)
  })

  it('refuses a clip ring of four positions', () => {
    const [territory] = description.territories
    expect(validate({ ...description, territories: [{ ...territory, clip: territory.clip.slice(0, 4) }] })).toBe(false)
  })
})
