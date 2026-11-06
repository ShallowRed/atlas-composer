import { readdirSync, readFileSync } from 'node:fs'
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
