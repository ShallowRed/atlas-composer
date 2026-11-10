import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { useLocalizedName } from '@/composables/useLocalizedName'
import i18n from '@/i18n'

const LABEL = { en: 'Legal Status', fr: 'Statut juridique' }

const Label = defineComponent({
  setup() {
    const { localize } = useLocalizedName()
    return () => h('span', localize(LABEL))
  },
})

describe('useLocalizedName', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('resolves a bilingual label in the current locale', async () => {
    i18n.global.locale.value = 'en'
    const wrapper = mount(Label, { global: { plugins: [i18n] } })
    expect(wrapper.text()).toBe('Legal Status')

    i18n.global.locale.value = 'fr'
    await nextTick()

    expect(wrapper.text()).toBe('Statut juridique')
  })
})
