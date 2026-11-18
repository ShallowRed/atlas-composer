import type { Ref } from 'vue'
import type { AtlasId, TerritoryCode } from '@/types'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { loadAtlasFromConfigs, withSetup } from '@/__tests__/test-utils'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import i18n from '@/i18n'
import { useGeoDataStore } from '@/stores/geoData'
import { useViewStore } from '@/stores/view'
import MapRenderer from '../MapRenderer.vue'

const editor = vi.hoisted(() => ({
  renderSelection: vi.fn(),
  moveLabel: null as Ref<string | null> | null,
}))

// The test reads the label that the map passes to the editor and the redraws of the selection
vi.mock('@/composables/useClipExtentEditor', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/composables/useClipExtentEditor')>()
  return {
    useClipExtentEditor: (options: Parameters<typeof original.useClipExtentEditor>[0]) => {
      editor.moveLabel = options.moveLabel
      return { ...original.useClipExtentEditor(options), renderSelection: editor.renderSelection }
    },
  }
})

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

  it('redraws the selection when a move of the territory ends', async () => {
    useViewStore().viewMode = 'composite-custom'
    const wrapper = mount(MapRenderer, { props: { mode: 'composite' }, global: { plugins: [i18n] } })
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    wrapper.find('.map-plot').element.append(svg)
    editor.moveLabel!.value = 'X 10  Y 20'
    await nextTick()
    editor.renderSelection.mockClear()

    editor.moveLabel!.value = null
    await nextTick()

    expect(editor.renderSelection).toHaveBeenCalledWith(svg)
    wrapper.unmount()
  })
})
