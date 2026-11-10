import type { AtlasId, TerritoryCode } from '@/types/branded'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { startApplication } from '@/__tests__/composite-utils'
import i18n from '@/i18n'
import { useCompositionStore } from '@/stores/composition'
import { useViewStore } from '@/stores/view'
import TerritoriesControl from '../TerritoriesControl.vue'

const FRANCE = 'france' as AtlasId
const MARTINIQUE = 'FR-MQ' as TerritoryCode

async function mountList() {
  i18n.global.locale.value = 'en'
  await startApplication(FRANCE)
  await useCompositionStore().initializeAtlas()
  useViewStore().viewMode = 'composite-custom'
  return mount(TerritoriesControl, { global: { plugins: [i18n] }, attachTo: document.body })
}

async function openMartinique(wrapper: Awaited<ReturnType<typeof mountList>>) {
  await wrapper.find(`button[data-territory="${MARTINIQUE}"]`).trigger('click')
  await nextTick()
}

describe('territoriesControl', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('opens the settings of a territory and focuses the back button', async () => {
    const wrapper = await mountList()

    await openMartinique(wrapper)

    expect(wrapper.find('h3').text()).toContain('Martinique')
    expect(wrapper.find('button[data-territory]').exists()).toBe(false)
    expect(document.activeElement?.textContent).toContain('Territories')
    wrapper.unmount()
  })

  it('goes back to the list and focuses the row of the territory', async () => {
    const wrapper = await mountList()
    await openMartinique(wrapper)

    await wrapper.find('button.btn-ghost').trigger('click')
    await nextTick()

    expect(wrapper.find(`button[data-territory="${MARTINIQUE}"]`).exists()).toBe(true)
    expect((document.activeElement as HTMLElement | null)?.dataset.territory).toBe(MARTINIQUE)
    wrapper.unmount()
  })

  it('shows the list when the open territory leaves the composition', async () => {
    const wrapper = await mountList()
    await openMartinique(wrapper)

    const viewStore = useViewStore()
    viewStore.setActiveTerritories([...viewStore.activeTerritoryCodes].filter(code => code !== MARTINIQUE))
    await nextTick()

    expect(wrapper.find('button[data-territory]').exists()).toBe(true)
    viewStore.setActiveTerritories([...viewStore.activeTerritoryCodes, MARTINIQUE])
    await nextTick()
    expect(wrapper.find('button[data-territory]').exists()).toBe(true)
    wrapper.unmount()
  })
})
