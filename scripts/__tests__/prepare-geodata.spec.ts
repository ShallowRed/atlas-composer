import { createHash } from 'node:crypto'
import { prepareAtlasData } from '#scripts/geodata/prepare'
import { readWorldData } from '#scripts/utils/ne-data'
import { describe, expect, it } from 'vitest'

// Keys sorted, features ordered by id and the creation date left out, so that a reordering alone keeps the digest
function canonical(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]))
  return value
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}

const PREPARED_ATLASES = [
  ['france', '50m'],
  ['portugal', '50m'],
  ['spain', '50m'],
  ['usa', '50m'],
  ['europe', '50m'],
  ['world', '110m'],
] as const

describe('prepareAtlasData', () => {
  it.each(PREPARED_ATLASES)('prepares the territories and the metadata of %s in %s', async (atlas, resolution) => {
    const prepared = await prepareAtlasData(atlas, await readWorldData(resolution), { resolution, created: '' })
    const features = [...prepared.territories.features]
      .sort((a, b) => String(a.properties?.id).localeCompare(String(b.properties?.id)))

    expect({
      territories: digest({ ...prepared.territories, features }),
      metadata: digest({ ...prepared.metadata, created: undefined }),
    }).toMatchSnapshot()
  })
})
