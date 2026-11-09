import type { JSONAtlasConfig } from '#types'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionStrategy } from '@/core/projections/types'

const ATLASES_DIRECTORY = 'configs/atlases'

const preferences = readdirSync(ATLASES_DIRECTORY)
  .map(file => JSON.parse(readFileSync(`${ATLASES_DIRECTORY}/${file}`, 'utf8')) as JSONAtlasConfig)
  .map(atlas => ({ id: atlas.id, ...atlas.projectionPreferences }))

const compositeProjections = preferences.flatMap(({ id, defaultCompositeProjection }) =>
  defaultCompositeProjection === undefined ? [] : [[id, defaultCompositeProjection] as const])

const recommendedProjections = preferences.flatMap(({ id, recommended = [] }) =>
  recommended.map(projection => [id, projection] as const))

describe('projection preferences of the atlases', () => {
  it.each(compositeProjections)('%s chooses %s, a definition of a d3 composite projection', (_, projection) => {
    const definition = projectionRegistry.get(projection)

    expect(definition?.id).toBe(projection)
    expect(definition?.strategy).toBe(ProjectionStrategy.D3_COMPOSITE)
  })

  it.each(recommendedProjections)('%s recommends %s, the id of a definition', (_, projection) => {
    expect(projectionRegistry.get(projection)?.id).toBe(projection)
  })
})
