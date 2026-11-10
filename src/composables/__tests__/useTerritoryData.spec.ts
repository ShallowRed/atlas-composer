import type { Territory } from '@/types'
import type { AtlasId, TerritoryCode } from '@/types/branded'
import { describe, expect, it } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { useGeoDataStore } from '@/stores/geoData'
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
}

describe('useTerritoryData', () => {
  it('lists the active territories', async () => {
    await openTerritories([GUADELOUPE, MARTINIQUE])

    expect(useTerritoryData().territories.value).toEqual([
      { code: GUADELOUPE, name: 'Guadeloupe' },
      { code: MARTINIQUE, name: 'Martinique' },
    ])
  })

  it('lists nothing without active territory', async () => {
    await openTerritories([])

    expect(useTerritoryData().territories.value).toEqual([])
  })
})
