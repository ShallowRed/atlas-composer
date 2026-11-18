import { describe, expect, it } from 'vitest'
import { resolutionOfDataSources } from '#scripts/utils/ne-data'

describe('resolutionOfDataSources', () => {
  it('reads the resolution at the end of the file names', () => {
    expect(resolutionOfDataSources({ territories: 'world-territories-50m.json', metadata: 'world-metadata-50m.json' })).toBe('50m')
  })

  it.each([
    ['france-territories-10m.json', 'france-metadata-50m.json'],
    ['france-territories.json', 'france-metadata.json'],
    ['france-territories-20m.json', 'france-metadata-20m.json'],
  ])('refuses %s and %s', (territories, metadata) => {
    expect(() => resolutionOfDataSources({ territories, metadata })).toThrow('pass --resolution')
  })
})
