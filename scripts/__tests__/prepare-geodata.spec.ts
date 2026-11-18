import type { GeometryCollection } from 'topojson-specification'
import { createHash } from 'node:crypto'
import { geoContains } from 'd3-geo'
import { feature } from 'topojson-client'
import { describe, expect, it } from 'vitest'
import { prepareAtlasData, toTopology } from '#scripts/geodata/prepare'
import { readWorldData } from '#scripts/utils/ne-data'

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
  ['france', '10m'],
  ['portugal', '10m'],
  ['spain', '10m'],
  ['usa', '10m'],
  ['europe', '10m'],
  ['world', '50m'],
] as const

async function prepare(atlas: string, resolution: '10m' | '50m' | '110m') {
  const ruleTopology = resolution === '10m' ? await readWorldData('50m') : undefined
  return prepareAtlasData(atlas, await readWorldData(resolution), { resolution, created: '', ruleTopology })
}

describe('prepareAtlasData', () => {
  it.each(PREPARED_ATLASES)('prepares the territories and the metadata of %s in %s', async (atlas, resolution) => {
    const prepared = await prepare(atlas, resolution)
    const features = [...prepared.territories.features]
      .sort((a, b) => String(a.properties?.id).localeCompare(String(b.properties?.id)))

    expect({
      territories: digest({ ...prepared.territories, features }),
      metadata: digest({ ...prepared.metadata, created: undefined }),
    }).toMatchSnapshot()
  })

  it('writes a topology whose object territories holds the code of each territory', async () => {
    const topology = toTopology((await prepare('france', '10m')).territories)
    const territories = topology.objects.territories as GeometryCollection<{ code: string }>

    expect(feature(topology, territories).features.map(territory => territory.properties.code).sort()).toEqual(
      ['FR-BL', 'FR-GF', 'FR-GP', 'FR-MET', 'FR-MF', 'FR-MQ', 'FR-NC', 'FR-PF', 'FR-PF-2', 'FR-PM', 'FR-RE', 'FR-TF', 'FR-WF', 'FR-YT'],
    )
  })

  it('gives the world at 50m one territory WD-036, which holds Australia', async () => {
    const topology = toTopology((await prepare('world', '50m')).territories)
    const australia = feature(topology, topology.objects.territories as GeometryCollection<{ code: string }>).features.filter(territory => territory.properties?.code === 'WD-036')

    expect(australia).toHaveLength(1)
    expect(geoContains(australia[0]!, [134, -25])).toBe(true)
  })
})
