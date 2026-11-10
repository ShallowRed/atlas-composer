import { describe, expect, it } from 'vitest'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAvailableAtlasesGrouped } from '@/core/atlases/registry'

describe('getAvailableAtlasesGrouped', () => {
  it('gives the labels of the groups and the names of the atlases in each locale', () => {
    const countries = getAvailableAtlasesGrouped().find(({ id }) => id === 'country')!
    const usa = countries.options.find(({ value }) => value === 'usa')!

    expect(resolveI18nValue(countries.label, 'en')).toBe('Countries')
    expect(resolveI18nValue(usa.label, 'en')).toBe('United States')
    expect(resolveI18nValue(countries.label, 'fr')).toBe('Pays')
    expect(resolveI18nValue(usa.label, 'fr')).toBe('États-Unis')
  })
})
