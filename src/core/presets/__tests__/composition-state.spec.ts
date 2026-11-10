import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { TerritoryCode } from '@/types/branded'
import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { compositionStateFromConfig, compositionStateWithoutConfig } from '../composition-state'
import { extractTerritoryParameters } from '../converter'

const config = JSON.parse(readPresetFiles().find(({ id }) => id === 'france-pseudo-d3cp')!.json) as CompositeProjectionConfig

describe('compositionStateFromConfig', () => {
  it('gives the parameters, the territories in the order of the file and the canvas of a composite file', () => {
    expect(compositionStateFromConfig(config)).toEqual({
      territoryParameters: extractTerritoryParameters(config),
      activeTerritories: config.territories.map(({ code }) => code),
      canvas: { referenceScale: config.referenceScale, dimensions: config.canvasDimensions },
    })
  })
})

describe('compositionStateWithoutConfig', () => {
  it('gives each territory the fallback projection and the default layout, without active territory nor canvas', () => {
    expect(compositionStateWithoutConfig(['FR-MET', 'FR-GP'] as TerritoryCode[])).toEqual({
      territoryParameters: {
        'FR-MET': { projectionId: FALLBACK_PROJECTION_ID, translateOffset: [0, 0], scaleMultiplier: 1 },
        'FR-GP': { projectionId: FALLBACK_PROJECTION_ID, translateOffset: [0, 0], scaleMultiplier: 1 },
      },
      activeTerritories: [],
      canvas: null,
    })
  })
})
