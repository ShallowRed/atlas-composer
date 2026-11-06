import type { ProjectionFamily } from '@atlas-composer/specification'
import { PROJECTION_CATALOG } from '@atlas-composer/specification'
import { describe, expect, it } from 'vitest'
import { projectionRegistry } from '@/core/projections/registry'

const catalog: Record<string, { family: ProjectionFamily, aliases: readonly string[] }> = PROJECTION_CATALOG

const exportableDefinitions = projectionRegistry.getAll()
  .filter(definition => definition.capabilities.supportsComposite)

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
