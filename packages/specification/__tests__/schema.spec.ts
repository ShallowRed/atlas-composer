import { readdirSync, readFileSync } from 'node:fs'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'

const SPECIFICATION = 'packages/specification'

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function jsonFiles(folder: string) {
  return readdirSync(folder).filter(file => file.endsWith('.json')).map(file => `${folder}/${file}`)
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
ajv.addSchema(readJson(`${SPECIFICATION}/schemas/definitions.schema.json`))
const validate = ajv.compile(readJson(`${SPECIFICATION}/schemas/composite-projection.schema.json`))

// A composite-custom preset has no type field
const compositePresets = readdirSync('configs/presets')
  .flatMap(atlas => jsonFiles(`configs/presets/${atlas}`))
  .filter(path => readJson(path).type === undefined)

describe('composite projection schema', () => {
  it.each(jsonFiles(`${SPECIFICATION}/__tests__/fixtures/valid`))('accepts %s', (path) => {
    expect(validate(readJson(path)), JSON.stringify(validate.errors)).toBe(true)
  })

  it.each(jsonFiles(`${SPECIFICATION}/__tests__/fixtures/invalid`))('refuses %s', (path) => {
    expect(validate(readJson(path))).toBe(false)
  })

  it.each(compositePresets)('accepts the preset %s', (path) => {
    expect(validate(readJson(path)), JSON.stringify(validate.errors)).toBe(true)
  })
})
