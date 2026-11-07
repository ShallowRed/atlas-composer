import { describe, expect, it } from 'vitest'
import { getInitialTerritoryMode } from '@/core/atlases/utils'

const OPTIONS = [{ value: 'metropole-only', label: 'Metropole' }, { value: 'all-territories', label: 'All' }]

describe('getInitialTerritoryMode', () => {
  it('gives the first option of an atlas with a territory selector', () => {
    expect(getInitialTerritoryMode({ hasTerritorySelector: true, territoryModeOptions: OPTIONS })).toBe('metropole-only')
  })

  it('gives all territories to an atlas without territory selector', () => {
    expect(getInitialTerritoryMode({ hasTerritorySelector: false })).toBe('all-territories')
  })

  it('gives all territories to a wildcard atlas without option', () => {
    expect(getInitialTerritoryMode({ hasTerritorySelector: true, isWildcard: true, territoryModeOptions: [] })).toBe('all-territories')
  })

  it('throws for an atlas with a territory selector and no option', () => {
    expect(() => getInitialTerritoryMode({ hasTerritorySelector: true, territoryModeOptions: [] })).toThrow()
  })
})
