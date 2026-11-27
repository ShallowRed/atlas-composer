import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { CompositionEntry } from '../composition-state'
import type { TerritoryCode } from '@/types/branded'
import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { compositionStateFromConfig, compositionStateWithoutConfig, entryName, insertInCatalogueOrder } from '../composition-state'
import { extractTerritoryParameters } from '../converter'

const compositePresets = readPresetFiles()
  .filter(({ type }) => type === 'composite-custom')
  .map(({ id, json }) => ({ id, config: JSON.parse(json) as CompositeProjectionConfig }))
const config = compositePresets.find(({ id }) => id === 'france-pseudo-d3cp')!.config

function entry(code: string, bounds?: CompositionEntry['bounds']): CompositionEntry {
  return { code: code as TerritoryCode, name: code, ...(bounds && { bounds }) }
}

describe('compositionStateFromConfig', () => {
  it('gives the parameters, the territories and the entries in the order of the file and the canvas of a composite file', () => {
    expect(compositionStateFromConfig(config)).toEqual({
      territoryParameters: extractTerritoryParameters(config),
      activeTerritories: config.territories.map(({ code }) => code),
      entries: config.territories.map(({ code, name, bounds }) => ({ code, name, bounds })),
      canvas: { referenceScale: config.referenceScale, dimensions: config.canvasDimensions },
    })
  })

  it.each(compositePresets)('gives an entry by territory of $id, with the code, the name and the bounds of the file, in its order', ({ config }) => {
    expect(compositionStateFromConfig(config).entries).toEqual(config.territories.map(({ code, name, bounds }) => ({ code, name, bounds })))
  })

  it('gives no bounds to an entry whose territory has none in the file', () => {
    const [first, ...rest] = config.territories
    const { bounds: _bounds, ...withoutBounds } = first!

    const [read] = compositionStateFromConfig({ ...config, territories: [withoutBounds, ...rest] }).entries

    expect(read).toEqual({ code: first!.code, name: first!.name })
  })
})

describe('compositionStateWithoutConfig', () => {
  it('gives each territory the fallback projection and the default layout, without active territory, entry nor canvas', () => {
    expect(compositionStateWithoutConfig(['FR-MET', 'FR-GP'] as TerritoryCode[])).toEqual({
      territoryParameters: {
        'FR-MET': { projectionId: FALLBACK_PROJECTION_ID, translateOffset: [0, 0], scaleMultiplier: 1 },
        'FR-GP': { projectionId: FALLBACK_PROJECTION_ID, translateOffset: [0, 0], scaleMultiplier: 1 },
      },
      activeTerritories: [],
      entries: [],
      canvas: null,
    })
  })
})

describe('entryName', () => {
  const catalogue = [{ code: 'FR-GP' as TerritoryCode, name: { en: 'Guadeloupe', fr: 'Guadeloupe' } }]

  it('gives the name of the catalogue for a code that it declares', () => {
    expect(entryName('FR-GP', 'GP', catalogue)).toEqual({ en: 'Guadeloupe', fr: 'Guadeloupe' })
  })

  it('gives the fallback name for a code that the catalogue does not declare', () => {
    expect(entryName('FR-XX', { en: 'Elsewhere' }, catalogue)).toEqual({ en: 'Elsewhere' })
  })
})

describe('insertInCatalogueOrder', () => {
  const catalogueCodes = ['A', 'B', 'C', 'D']

  it('inserts an entry before the first entry that follows it in the catalogue', () => {
    expect(insertInCatalogueOrder([entry('A'), entry('D')], entry('B'), catalogueCodes)).toEqual([entry('A'), entry('B'), entry('D')])
  })

  it('inserts an entry first when every entry follows it in the catalogue', () => {
    expect(insertInCatalogueOrder([entry('C'), entry('B')], entry('A'), catalogueCodes)).toEqual([entry('A'), entry('C'), entry('B')])
  })

  it('appends an entry that no entry follows in the catalogue', () => {
    expect(insertInCatalogueOrder([entry('A'), entry('B')], entry('D'), catalogueCodes)).toEqual([entry('A'), entry('B'), entry('D')])
  })

  it('appends an entry whose code the catalogue does not declare', () => {
    expect(insertInCatalogueOrder([entry('A'), entry('C')], entry('X'), catalogueCodes)).toEqual([entry('A'), entry('C'), entry('X')])
  })

  it('passes over the entries whose code the catalogue does not declare', () => {
    expect(insertInCatalogueOrder([entry('X'), entry('C')], entry('B'), catalogueCodes)).toEqual([entry('X'), entry('B'), entry('C')])
  })

  it('keeps the bounds of the inserted entry and leaves the given entries unchanged', () => {
    const entries = [entry('A')]

    expect(insertInCatalogueOrder(entries, entry('B', [[0, 0], [1, 1]]), catalogueCodes)).toEqual([entry('A'), entry('B', [[0, 0], [1, 1]])])
    expect(entries).toEqual([entry('A')])
  })
})
