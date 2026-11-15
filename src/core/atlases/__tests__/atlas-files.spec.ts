import type { JSONAtlasConfig, JSONTerritoryConfig } from '#types'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const ATLAS_DIR = 'configs/atlases'

const atlases = readdirSync(ATLAS_DIR)
  .filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(readFileSync(`${ATLAS_DIR}/${file}`, 'utf8')) as JSONAtlasConfig)
  .filter((atlas): atlas is JSONAtlasConfig & { territories: JSONTerritoryConfig[] } => atlas.territories !== '*')

describe('atlas files', () => {
  it.each(atlases.map(atlas => [atlas.id, atlas] as const))('%s names each territory in English and in French', (_id, atlas) => {
    for (const territory of atlas.territories) {
      expect(territory.name, territory.code).toEqual({ en: expect.any(String), fr: expect.any(String) })
    }
  })
})
