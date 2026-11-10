import type { AtlasId } from '@/types/branded'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { startApplication } from '@/__tests__/composite-utils'
import { useTerritoryModeOptions } from '@/composables/useTerritoryModeOptions'
import i18n from '@/i18n'
import { useCompositionStore } from '@/stores/composition'

const FRANCE = 'france' as AtlasId

const ModeLabels = defineComponent({
  setup() {
    const { options } = useTerritoryModeOptions()
    return () => h('ul', options.value.map(option => h('li', option.label)))
  },
})

describe('useTerritoryModeOptions', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('gives the territory modes of the atlas in the current locale', async () => {
    i18n.global.locale.value = 'en'
    await startApplication(FRANCE)
    await useCompositionStore().initializeAtlas()
    const wrapper = mount(ModeLabels, { global: { plugins: [i18n] } })
    const labels = () => wrapper.findAll('li').map(item => item.text())
    expect(labels()).toContain('Mainland only')

    i18n.global.locale.value = 'fr'
    await nextTick()

    expect(labels()).toEqual(['Métropole uniquement', 'Métropole + DROM', 'Métropole + DROM + COM', 'Tous les territoires'])
  })
})
