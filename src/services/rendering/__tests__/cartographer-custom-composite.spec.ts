import type { GeoProjection } from 'd3-geo'
import type { TerritoryContours } from '@/core/examples'
import type { ProjectionFrame } from '@/core/frames'
import type { AtlasId } from '@/types/branded'
import { geoPath } from 'd3-geo'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { boundsPolygon, openAtlasWithCartographer, openView } from '@/__tests__/composite-utils'
import { readAtlasContours, readPresetFiles } from '@/__tests__/test-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { minWeightAt } from '@/core/geometry'
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

  // The loader draws a shared frame once per sub-projection
  it('draws both territories through each entry of the frame that they share', () => {
    for (const entry of CODES) {
      const subProjection = cartographer.customComposite!.getSubProjectionData(entry)!.projection
      for (const feature of features) {
        expect(svg.querySelector(`g.entry[data-entry="${entry}"] path[data-territory="${feature.properties!.code}"]`)!.getAttribute('d'))
          .toBe(geoPath(subProjection)(feature))
      }
    }
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

// The topology of each atlas built from world-atlas at 50m by toTopology, as pnpm geodata:prepare builds the files of src/public/data, which
// are not versioned. A computed specifier keeps scripts/ out of the program of src/tsconfig.json, whose options differ from scripts/tsconfig.json.
const PREPARE = '#scripts/geodata/prepare'
const { toTopology } = await import(PREPARE) as { toTopology: (territories: TerritoryContours) => unknown }

describe.each(readPresetFiles().filter(preset => preset.type === 'composite-custom'))('drawing of the custom composite of $id through each entry', ({ id, atlasId, json }) => {
  let cartographer: NonNullable<Awaited<ReturnType<typeof openAtlasWithCartographer>>['cartographer']>
  let svg: SVGSVGElement
  let entries: { code: string, projection: GeoProjection }[]
  // The geometries of the active territories, each simplified with the weight of its code at the sub-projection of its entry
  let geometries: Map<string, GeoJSON.Feature>
  const fileOrder = (JSON.parse(json) as { territories: { code: string }[] }).territories.map(({ code }) => code)

  beforeAll(async () => {
    const geoDataStore = await openAtlasWithCartographer(atlasId)
    await openView('composite-custom')
    await useCompositionStore().loadPreset({ presetId: createPresetId(id) })
    cartographer = geoDataStore.cartographer!
    const topology = toTopology(readAtlasContours(atlasId))
    vi.stubGlobal('fetch', async (url: string) => new Response(JSON.stringify(url === cartographer.geoData.config.dataPath ? topology : {})))
    await cartographer.init()
    ;({ svg } = await cartographer.render({ mode: 'composite-custom', territoryMode: 'all-territories', projection: 'composite', width: 960, height: 500 }))

    entries = cartographer.customComposite!.getAllSubProjectionData().map(({ territoryCode, projection }) => ({ code: territoryCode, projection }))
    const weights = new Map(entries.flatMap(({ code, projection }) => {
      const centroid = cartographer.geoData.centroid(code)
      return centroid ? [[code, minWeightAt(projection, centroid)] as const] : []
    }))
    const simplified = cartographer.geoData.simplified(weights)
    geometries = new Map([...weights.keys()].map(code => [code, simplified.feature(code)!]))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  const pathOf = (entry: string, territory: string) => svg.querySelector(`g.entry[data-entry="${entry}"] g.territories path[data-entry="${entry}"][data-territory="${territory}"]`)

  it('draws the geometry of each entry in its own group as the drawing by code did', () => {
    for (const { code, projection } of entries) {
      const geometry = geometries.get(code)
      if (!geometry) {
        // A territory without a geometry at 50m
        expect(pathOf(code, code)).toBeNull()
        continue
      }
      const path = pathOf(code, code)
      if (path) {
        expect(path.getAttribute('d')).toBe(geoPath(projection)(geometry))
      }
    }
  })

  it('draws an active geometry in an entry when the sub-projection of the entry draws a part of it', () => {
    for (const { code: entry, projection } of entries) {
      for (const [territory, geometry] of geometries) {
        expect(pathOf(entry, territory) !== null, `${territory} in ${entry}`).toBe(Boolean(geoPath(projection)(geometry)))
      }
    }
  })

  it('draws one group per entry, in the order of the entries, with its fills then its borders', () => {
    const groups = [...svg.querySelectorAll(':scope > g.entry')]

    expect(groups.map(group => group.getAttribute('data-entry'))).toEqual(fileOrder.filter(code => entries.some(entry => entry.code === code)))
    expect(entries.map(({ code }) => code)).toEqual(fileOrder.filter(code => useViewStore().activeTerritoryCodes.has(createTerritoryCode(code))))
    for (const group of groups) {
      expect([...group.children].map(child => child.getAttribute('class'))).toEqual(['territories', 'borders'])
    }
  })
})
