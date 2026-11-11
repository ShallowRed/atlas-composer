import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { catalog, getDefaultPreset, getPreset, getPresetMetadata, listAtlases, listRegions } from '../src'

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const registry = readJson('configs/atlas-registry.json')

describe('atlas catalog', () => {
  it('has an entry for each atlas of the registry, with the path of its configuration', () => {
    expect(Object.values(catalog.atlases)).toEqual(registry.atlases.map((atlas: { id: string, group: string, name: { en: string } }) => ({
      id: atlas.id,
      name: atlas.name.en,
      group: atlas.group,
      path: `atlases/${atlas.id}.json`,
    })))
  })

  it('lists the atlases in alphabetical order and in the order of the registry', () => {
    expect(listAtlases()).toEqual([...listRegions()].sort())
    expect(listRegions()).toEqual(registry.atlases.map((atlas: { id: string }) => atlas.id))
  })
})

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
