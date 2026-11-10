import type { Territory } from '@/types'
import type { AtlasId, TerritoryCode } from '@/types/branded'
import { describe, expect, it } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import { useGeoDataStore } from '@/stores/geoData'
import { useViewStore } from '@/stores/view'

const ATLAS_ID = 'france' as AtlasId
const GUADELOUPE = 'FR-GP' as TerritoryCode
const MARTINIQUE = 'FR-MQ' as TerritoryCode

function territory(code: TerritoryCode, name: string): Territory {
  return { code, name, area: 1000, region: 'Caribbean', data: { type: 'FeatureCollection', features: [] } }
}

async function openView(viewMode: 'composite-custom' | 'unified') {
  await startApplication(ATLAS_ID)
  useGeoDataStore().territoriesData = [territory(GUADELOUPE, 'Guadeloupe'), territory(MARTINIQUE, 'Martinique')]
  const viewStore = useViewStore()
  viewStore.setActiveTerritories([GUADELOUPE, MARTINIQUE])
  viewStore.viewMode = viewMode
  const selection = useSelectedTerritory()
  selection.clearSelection()
  return selection
}

describe('useSelectedTerritory', () => {
  it('selects a territory of the list', async () => {
    const { selectTerritory, selectedTerritory } = await openView('composite-custom')

    selectTerritory(MARTINIQUE)

    expect(selectedTerritory.value).toEqual({ code: MARTINIQUE, name: 'Martinique' })
  })

  it('ignores a code outside the list', async () => {
    const { selectTerritory, hasSelectedTerritory } = await openView('composite-custom')

    selectTerritory('75')

    expect(hasSelectedTerritory.value).toBe(false)
  })

  it('selects nothing in a view without territory list', async () => {
    const { selectTerritory, hasSelectedTerritory } = await openView('unified')

    selectTerritory(MARTINIQUE)

    expect(hasSelectedTerritory.value).toBe(false)
  })

  it('drops the selection when the view has no territory list', async () => {
    const { selectTerritory, hasSelectedTerritory } = await openView('composite-custom')
    selectTerritory(MARTINIQUE)

    useViewStore().viewMode = 'unified'

    expect(hasSelectedTerritory.value).toBe(false)
  })
})
