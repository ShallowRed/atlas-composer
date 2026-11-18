import type { AtlasId, TerritoryCode } from '@/types'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAtlasFromConfigs, withSetup } from '@/__tests__/test-utils'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import i18n from '@/i18n'
import { useGeoDataStore } from '@/stores/geoData'
import { useViewStore } from '@/stores/view'
import MapRenderer from '../MapRenderer.vue'

const MAINLAND = 'FR-MET' as TerritoryCode

describe('mapRenderer', () => {
  beforeAll(async () => {
    await loadAtlasFromConfigs('france' as AtlasId)
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    withSetup(useSelectedTerritory).clearSelection()
  })

  // loadAtlasFromConfigs reads the configurations through a stubbed fetch
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('selects the territory of its map by a click in the split view', async () => {
    useViewStore().viewMode = 'split'
    useGeoDataStore().territoriesData = [{ code: MAINLAND, name: 'France métropolitaine' }] as never
    const wrapper = mount(MapRenderer, { props: { territoryCode: MAINLAND }, global: { plugins: [i18n] } })

    await wrapper.find('.map-plot').trigger('pointerdown')

    expect(withSetup(useSelectedTerritory).selectedTerritory.value?.code).toBe(MAINLAND)
    expect(wrapper.find('.map-plot').attributes('tabindex')).toBeUndefined()
    wrapper.unmount()
  })
})
