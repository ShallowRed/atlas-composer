import type { CompositeProjectionConfig, ProjectionFamily } from '@atlas-composer/specification'
import { readFileSync } from 'node:fs'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import { PROJECTION_CATALOG } from '@atlas-composer/specification'
import { describe, expect, it } from 'vitest'
import { projectionRegistry } from '@/core/projections/registry'

const catalog: Record<string, { family: ProjectionFamily, aliases: readonly string[] }> = PROJECTION_CATALOG

const exportableDefinitions = projectionRegistry.getAll()
  .filter(definition => definition.capabilities.supportsComposite)

const catalogAliases = Object.entries(catalog)
  .flatMap(([id, { aliases }]) => aliases.map(alias => ({ alias, id })))

const knownAliases = Object.entries(catalog)
  .filter(([id]) => projectionRegistry.get(id)?.id === id)
  .flatMap(([id, { aliases }]) => aliases.map(alias => ({ alias, id })))

describe('projection catalog of the specification', () => {
  it.each(exportableDefinitions)('lists $id with the family of its definition', ({ id, family }) => {
    expect(catalog[id]?.family).toBe(family)
  })

  it.each(knownAliases)('resolves $alias to the definition of $id', ({ alias, id }) => {
    expect(projectionRegistry.get(alias)?.id).toBe(id)
  })
})

describe('projection table of the loader', () => {
  const loader = new ProjectionLoader()
  loader.registerAll(d3ProjectionFactories)
  const minimal: CompositeProjectionConfig = JSON.parse(readFileSync('packages/specification/__tests__/fixtures/valid/minimal.json', 'utf8'))

  function loadWithId(id: string) {
    const [territory] = minimal.territories
    return loader.load({ ...minimal, territories: [{ ...territory, projection: { ...territory.projection, id } }] }, minimal.canvasDimensions)
  }

  it('has the identifiers of the catalog as keys', () => {
    expect(Object.keys(d3ProjectionFactories).sort()).toEqual(Object.keys(catalog).sort())
  })

  it.each(catalogAliases)('loads $alias with the factory of $id', ({ alias, id }) => {
    const point: [number, number] = [-61.81, 15.83]

    expect(loadWithId(alias)(point)).toEqual(loadWithId(id)(point))
  })
})
