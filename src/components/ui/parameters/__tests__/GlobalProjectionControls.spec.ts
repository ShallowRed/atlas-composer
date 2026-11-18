import type { AtlasId } from '@/types'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import i18n from '@/i18n'
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

  it('names the lock by one label and gives its state by aria-pressed', async () => {
    const lock = setup().wrapper.get('button[aria-pressed]')
    expect(lock.attributes()).toMatchObject({ 'aria-label': 'Verrouiller les proportions', 'title': 'Verrouiller les proportions', 'aria-pressed': 'true' })

    await lock.trigger('click')

    expect(lock.attributes()).toMatchObject({ 'aria-label': 'Verrouiller les proportions', 'title': 'Verrouiller les proportions', 'aria-pressed': 'false' })
  })
})
