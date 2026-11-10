import type { AtlasId } from '@/types/branded'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { startApplication } from '@/__tests__/composite-utils'
import i18n from '@/i18n'
import { useCompositionStore } from '@/stores/composition'
import TerritorySetManager from '../TerritorySetManager.vue'

const FRANCE = 'france' as AtlasId

async function mountInEnglish() {
  i18n.global.locale.value = 'en'
  await startApplication(FRANCE)
  await useCompositionStore().initializeAtlas()
  return mount(TerritorySetManager, { global: { plugins: [i18n] } })
}

describe('territorySetManager', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.fails('shows the collection sets in the locale chosen after the loading', async () => {
    const wrapper = await mountInEnglish()
    expect(wrapper.findAll('option').map(option => option.text())).toContain('Legal Status')

    i18n.global.locale.value = 'fr'
    await nextTick()

    expect(wrapper.findAll('option').map(option => option.text())).toContain('Statut juridique')
  })

  it.fails('shows the collections in the locale chosen after the loading', async () => {
    const wrapper = await mountInEnglish()
    expect(wrapper.text()).toContain('Overseas Departments (DROM)')

    i18n.global.locale.value = 'fr'
    await nextTick()

    expect(wrapper.text()).toContain('Statut sui generis')
    expect(wrapper.text()).not.toContain('Overseas Departments (DROM)')
  })
})
