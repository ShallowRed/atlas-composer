import type { Territory } from '@/types'
import type { AtlasId, ProjectionId, TerritoryCode } from '@/types/branded'
import { describe, expect, it } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

const ATLAS_ID = 'france' as AtlasId
const GUADELOUPE = 'FR-GP' as TerritoryCode
const MARTINIQUE = 'FR-MQ' as TerritoryCode

function territory(code: TerritoryCode, name: string): Territory {
  return { code, name, area: 1000, region: 'Caribbean', data: { type: 'FeatureCollection', features: [] } }
}

async function openTerritories(codes: TerritoryCode[]) {
  await startApplication(ATLAS_ID)
  useGeoDataStore().territoriesData = [territory(GUADELOUPE, 'Guadeloupe'), territory(MARTINIQUE, 'Martinique')]
  useViewStore().setActiveTerritories(codes)
  return useParameterStore()
}

describe('useTerritoryData', () => {
  it('lists the translation, scale and projection of each active territory', async () => {
    const parameterStore = await openTerritories([GUADELOUPE, MARTINIQUE])
    parameterStore.setTerritoryTranslation(GUADELOUPE, 'x', 100)
    parameterStore.setTerritoryTranslation(GUADELOUPE, 'y', 50)
    parameterStore.setTerritoryParameter(GUADELOUPE, 'scaleMultiplier', 1.5)
    parameterStore.setTerritoryTranslation(MARTINIQUE, 'x', 200)
    parameterStore.setTerritoryTranslation(MARTINIQUE, 'y', 100)
    parameterStore.setTerritoryParameter(MARTINIQUE, 'scaleMultiplier', 2)
    parameterStore.setTerritoryProjection(GUADELOUPE, 'mercator' as ProjectionId)
    parameterStore.setTerritoryProjection(MARTINIQUE, 'azimuthal-equal-area' as ProjectionId)

    const { territories, translations, scales, projections } = useTerritoryData()

    expect(territories.value).toEqual([
      { code: GUADELOUPE, name: 'Guadeloupe' },
      { code: MARTINIQUE, name: 'Martinique' },
    ])
    expect(translations.value).toEqual({ [GUADELOUPE]: { x: 100, y: 50 }, [MARTINIQUE]: { x: 200, y: 100 } })
    expect(scales.value).toEqual({ [GUADELOUPE]: 1.5, [MARTINIQUE]: 2 })
    expect(projections.value).toEqual({ [GUADELOUPE]: 'mercator', [MARTINIQUE]: 'azimuthal-equal-area' })
  })

  it('gives a scale of 1 to a territory without scale multiplier', async () => {
    await openTerritories([GUADELOUPE, MARTINIQUE])

    expect(useTerritoryData().scales.value).toEqual({ [GUADELOUPE]: 1, [MARTINIQUE]: 1 })
  })

  it('leaves out a territory without projection', async () => {
    await openTerritories([GUADELOUPE, MARTINIQUE])

    expect(useTerritoryData().projections.value).toEqual({})
  })

  it('lists nothing without active territory', async () => {
    await openTerritories([])

    const { territories, translations, scales, projections } = useTerritoryData()

    expect(territories.value).toEqual([])
    expect(translations.value).toEqual({})
    expect(scales.value).toEqual({})
    expect(projections.value).toEqual({})
  })

  it('updates when a territory parameter changes', async () => {
    const parameterStore = await openTerritories([GUADELOUPE])
    const { translations, projections } = useTerritoryData()
    expect(translations.value[GUADELOUPE]).toEqual({ x: 0, y: 0 })
    expect(projections.value).toEqual({})

    parameterStore.setTerritoryTranslation(GUADELOUPE, 'x', 100)
    parameterStore.setTerritoryProjection(GUADELOUPE, 'mercator' as ProjectionId)

    expect(translations.value[GUADELOUPE]).toEqual({ x: 100, y: 0 })
    expect(projections.value).toEqual({ [GUADELOUPE]: 'mercator' })
  })
})
