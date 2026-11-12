import type { GeoProjection } from 'd3-geo'
import type { AtlasId } from '@/types/branded'
import { geoPath } from 'd3-geo'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { boundsPolygon, openAtlasWithCartographer } from '@/__tests__/composite-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { useCompositionStore } from '@/stores/composition'
import { createPresetId } from '@/types/branded'

const FRANCE = 'france' as AtlasId
// The two territories have the same frame in this preset, so each one falls in the frame of the other
const CODES = ['FR-MF', 'FR-BL']

function territoryInBounds(code: string): GeoJSON.Feature<GeoJSON.Polygon> {
  const territory = getAtlasConfig(FRANCE).compositeTerritories!.territories.find(candidate => candidate.code === code)!
  return boundsPolygon(territory.bounds!, { code, name: territory.name })
}

describe('drawing of the custom composite of france-proportional', () => {
  let features: GeoJSON.Feature<GeoJSON.Polygon>[]
  let cartographer: NonNullable<Awaited<ReturnType<typeof openAtlasWithCartographer>>['cartographer']>
  let svg: SVGSVGElement

  beforeAll(async () => {
    const geoDataStore = await openAtlasWithCartographer(FRANCE)
    features = CODES.map(territoryInBounds)
    await useCompositionStore().loadPreset({ presetId: createPresetId('france-proportional') })
    cartographer = geoDataStore.cartographer!
    vi.spyOn(cartographer.geoData, 'getRawUnifiedData').mockResolvedValue({ type: 'FeatureCollection', features })
    svg = await cartographer.render({
      mode: 'composite-custom',
      territoryMode: 'all-territories',
      territoryCodes: CODES,
      projection: 'composite',
      width: 960,
      height: 500,
    })
  })

  it.each(CODES)('draws %s through the sub-projection of its code only', (code) => {
    const subProjection = cartographer.customComposite!.getSubProjectionData(code)!.projection
    const feature = features.find(candidate => candidate.properties!.code === code)!
    const ownPath = geoPath(subProjection)(feature)!
    const compositePath = geoPath(cartographer.lastProjection as GeoProjection)(feature)!

    expect(svg.querySelector(`g.territories path[data-territory="${code}"]`)!.getAttribute('d')).toBe(ownPath)
    expect(compositePath).toContain(ownPath)
    expect(compositePath).not.toBe(ownPath)
  })
})
