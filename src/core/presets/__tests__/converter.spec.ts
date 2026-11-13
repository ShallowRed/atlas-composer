import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { extractTerritoryParameters } from '../converter'

const compositePresets = readPresetFiles()
  .filter(({ type }) => type === 'composite-custom')
  .map(({ id, json }) => [id, JSON.parse(json) as CompositeProjectionConfig] as const)

// tilt, distance and scale are keys of the specification that the parameter registry does not hold
const withoutScaleMultiplier = {
  territories: [{
    code: 'FR-MET',
    projection: {
      id: 'conic-conformal',
      parameters: { rotate: [-3, 0, 0], parallels: [44, 49], tilt: 30, distance: 2, scale: 1000 },
    },
    layout: { translateOffset: [10, -20] },
  }],
} as unknown as CompositeProjectionConfig

// Centers of the d3 factories that differ from [0, 0]
const factoryCenters: Record<string, [number, unknown]> = {
  'conic-equidistant': [0, expect.closeTo(13.9389, 4)],
  'conic-equal-area': [0, expect.closeTo(33.6442, 4)],
}

describe('extractTerritoryParameters', () => {
  it.each(compositePresets)('gives the projection, the parameters and the layout of each territory of %s, with the center of the d3 factory when the file omits it', (_id, config) => {
    expect(extractTerritoryParameters(config)).toEqual(Object.fromEntries(config.territories.map(territory => [territory.code, {
      projectionId: territory.projection.id,
      ...territory.projection.parameters,
      center: territory.projection.parameters.center ?? factoryCenters[territory.projection.id],
      translateOffset: territory.layout.translateOffset,
      pixelClipExtent: territory.layout.pixelClipExtent,
    }])))
  })

  it('gives the default scaleMultiplier to a territory whose file omits it, and leaves out the keys that the parameter registry does not hold', () => {
    expect(extractTerritoryParameters(withoutScaleMultiplier)['FR-MET']).toEqual({
      projectionId: 'conic-conformal',
      rotate: [-3, 0, 0],
      parallels: [44, 49],
      translateOffset: [10, -20],
      scaleMultiplier: 1,
    })
  })
})
