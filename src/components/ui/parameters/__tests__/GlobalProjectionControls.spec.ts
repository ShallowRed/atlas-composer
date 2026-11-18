import type { AtlasId } from '@/types'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import i18n from '@/i18n'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import GlobalProjectionControls from '../GlobalProjectionControls.vue'

describe('globalProjectionControls', () => {
  beforeAll(async () => {
    await loadAtlasFromConfigs('france' as AtlasId)
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'fr'
  })

  // loadAtlasFromConfigs reads the configurations through a stubbed fetch
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  function setup() {
    const projectionStore = useProjectionStore()
    projectionStore.canvasDimensions = { width: 1000, height: 400 }
    return { projectionStore, wrapper: mount(GlobalProjectionControls, { global: { plugins: [i18n] } }) }
  }

  it('keeps the side that the lock computes at one pixel at least', async () => {
    const { projectionStore, wrapper } = setup()
    const width = wrapper.get('input[aria-label="Largeur du canevas"]')

    await width.setValue('1')
    await width.trigger('keydown', { key: 'Enter' })

    expect(projectionStore.canvasDimensions).toEqual({ width: 1, height: 1 })
  })

  it('keeps the ratio of the canvas while the lock holds, through a side of one pixel', async () => {
    const { projectionStore, wrapper } = setup()
    const width = wrapper.get('input[aria-label="Largeur du canevas"]')

    for (const value of ['1', '1000']) {
      await width.setValue(value)
      await width.trigger('keydown', { key: 'Enter' })
    }

    expect(projectionStore.canvasDimensions).toEqual({ width: 1000, height: 400 })
  })

  it('takes the ratio of the canvas when the lock turns on and when the canvas changes from outside the fields', async () => {
    const { projectionStore, wrapper } = setup()
    const lock = wrapper.get('button[aria-pressed]')
    const width = wrapper.get('input[aria-label="Largeur du canevas"]')
    const height = wrapper.get('input[aria-label="Hauteur du canevas"]')

    await lock.trigger('click')
    await height.setValue('500')
    await height.trigger('keydown', { key: 'Enter' })
    await lock.trigger('click')
    await width.setValue('500')
    await width.trigger('keydown', { key: 'Enter' })
    expect(projectionStore.canvasDimensions).toEqual({ width: 500, height: 250 })

    projectionStore.canvasDimensions = { width: 900, height: 300 }
    await wrapper.vm.$nextTick()
    await width.setValue('300')
    await width.trigger('keydown', { key: 'Enter' })
    expect(projectionStore.canvasDimensions).toEqual({ width: 300, height: 100 })
  })

  it('locks the ratio of the canvas of the preset after a reset', async () => {
    const { projectionStore, wrapper } = setup()
    vi.spyOn(usePresetDefaultsStore(), 'referenceCanvas').mockReturnValue({ referenceScale: 2700, dimensions: { width: 1000, height: 400 } })
    const lock = wrapper.get('button[aria-pressed]')
    const width = wrapper.get('input[aria-label="Largeur du canevas"]')
    const height = wrapper.get('input[aria-label="Hauteur du canevas"]')
    const enter = async (field: typeof width, value: string) => {
      await field.setValue(value)
      await field.trigger('keydown', { key: 'Enter' })
    }

    // A lock taken on a canvas of 1000 by 500, then the canvas of the preset again with the lock off
    await lock.trigger('click')
    await enter(height, '500')
    await lock.trigger('click')
    await lock.trigger('click')
    await enter(height, '400')
    projectionStore.referenceScale = 3000
    await wrapper.vm.$nextTick()
    await wrapper.get('button:not([aria-pressed])').trigger('click')
    await enter(width, '500')

    expect(projectionStore.canvasDimensions).toEqual({ width: 500, height: 200 })
  })

  it('names the lock by one label and gives its state by aria-pressed', async () => {
    const lock = setup().wrapper.get('button[aria-pressed]')
    expect(lock.attributes()).toMatchObject({ 'aria-label': 'Verrouiller les proportions', 'title': 'Verrouiller les proportions', 'aria-pressed': 'true' })

    await lock.trigger('click')

    expect(lock.attributes()).toMatchObject({ 'aria-label': 'Verrouiller les proportions', 'title': 'Verrouiller les proportions', 'aria-pressed': 'false' })
  })
})
