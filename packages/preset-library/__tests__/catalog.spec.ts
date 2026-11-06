import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { catalog, getDefaultPreset, getPreset, getPresetMetadata } from '../src'

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const registry = readJson('configs/atlas-registry.json')

describe('preset catalog', () => {
  it('has an entry for each preset of the registry', () => {
    const presetCount = registry.atlases.reduce((count: number, atlas: { presets: unknown[] }) => count + atlas.presets.length, 0)

    expect(Object.keys(catalog.presets)).toHaveLength(presetCount)
  })

  it('tags the default preset of an atlas only', () => {
    expect(getPresetMetadata('france-pseudo-d3cp')?.tags).toEqual(['default'])
    expect(getPresetMetadata('france-standard')?.tags).toEqual([])
  })

  it('returns the default preset of the registry', () => {
    expect(getDefaultPreset('france')?.id).toBe('france-pseudo-d3cp')
  })

  it('takes the English name of the registry', () => {
    expect(getPresetMetadata('france-standard')?.name).toBe('NSP composite')
  })

  it('loads the file of a composite-custom preset', async () => {
    expect(await getPreset('france-standard')).toEqual(readJson('configs/presets/france/france-standard.json'))
  })
})
