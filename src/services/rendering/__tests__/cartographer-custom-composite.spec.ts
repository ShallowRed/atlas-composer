import type { GeoProjection } from 'd3-geo'
import type { ProjectionFrame } from '@/core/frames'
import type { AtlasId } from '@/types/branded'
import { geoPath } from 'd3-geo'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { boundsPolygon, openAtlasWithCartographer } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { useCompositionStore } from '@/stores/composition'
import { useViewStore } from '@/stores/view'
import { createPresetId, createTerritoryCode } from '@/types/branded'

const FRANCE = 'france' as AtlasId
// The two territories have the same frame in this preset, so each one falls in the frame of the other
const CODES = ['FR-MF', 'FR-BL']
// A territory of the preset left out of the active territories
const INACTIVE = 'FR-MET'

function territoryInBounds(code: string): GeoJSON.Feature<GeoJSON.Polygon> {
  const territory = getAtlasConfig(FRANCE).compositeTerritories!.territories.find(candidate => candidate.code === code)!
  return boundsPolygon(territory.bounds!, { code, name: territory.name })
}

describe('drawing of the custom composite of france-proportional', () => {
  let features: GeoJSON.Feature<GeoJSON.Polygon>[]
  let cartographer: NonNullable<Awaited<ReturnType<typeof openAtlasWithCartographer>>['cartographer']>
  let svg: SVGSVGElement
  let frames: ProjectionFrame[]
  // The active territories in the order of the preset file
  const entryOrder = (JSON.parse(readPresetFiles().find(({ id }) => id === 'france-proportional')!.json) as { territories: { code: string }[] })
    .territories
    .map(({ code }) => code)
    .filter(code => CODES.includes(code))

  const render = () => cartographer.render({
    mode: 'composite-custom',
    territoryMode: 'all-territories',
    projection: 'composite',
    width: 960,
    height: 500,
  })

  beforeAll(async () => {
    const geoDataStore = await openAtlasWithCartographer(FRANCE)
    features = CODES.map(territoryInBounds)
    // The preset sets its own active territories, so the test sets its codes after it
    await useCompositionStore().loadPreset({ presetId: createPresetId('france-proportional') })
    useViewStore().setActiveTerritories(CODES.map(createTerritoryCode))
    cartographer = geoDataStore.cartographer!
    vi.spyOn(cartographer.geoData, 'getRawUnifiedData').mockResolvedValue({
      type: 'FeatureCollection',
      features: [...features, territoryInBounds(INACTIVE)],
    })
    ;({ svg, frames } = await render())
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

  // The basemap draws one frame per active territory, in the order of the entries, from the projections of this render
  it('gives the frames of the active territories only', () => {
    expect(frames.map(frame => frame.code)).toEqual(entryOrder)
    for (const frame of frames) {
      expect(frame.projection).toBe(cartographer.customComposite!.getSubProjectionData(frame.code)!.projection)
    }
  })

  it('reads the data of the active territories, and draws no path for another territory', () => {
    expect(cartographer.geoData.getRawUnifiedData).toHaveBeenCalledWith('all-territories', entryOrder)
    expect(svg.querySelector(`g.territories path[data-territory="${INACTIVE}"]`)).toBeNull()
    expect(frames.map(frame => frame.code)).not.toContain(INACTIVE)
  })

  it('draws an empty map without an active territory', async () => {
    useViewStore().setActiveTerritories([])
    const empty = await render()
    expect(empty.svg.querySelectorAll('g.territories path')).toHaveLength(0)
    expect(empty.frames).toEqual([])
    expect(cartographer.lastProjection).toBeNull()
  })
})
