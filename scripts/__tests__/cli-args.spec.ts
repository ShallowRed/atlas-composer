import { describe, expect, it } from 'vitest'
import { getResolution } from '#scripts/utils/cli-args'
import { resolutionOfDataSources } from '#scripts/utils/ne-data'

describe('getResolution', () => {
  it('takes --resolution without reading dataSources that name no resolution', () => {
    const args = { atlas: 'france', country: 'france', resolution: '50m' as const, help: false, _unknown: [] }

    expect(getResolution(args, () => resolutionOfDataSources({ territories: 'france-territories.json', metadata: 'france-metadata.json' }))).toBe('50m')
  })
})
