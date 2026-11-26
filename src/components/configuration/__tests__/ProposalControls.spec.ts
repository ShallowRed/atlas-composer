import type { AtlasId, TerritoryCode } from '@/types/branded'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { openCompositeWithContours } from '@/__tests__/composite-utils'
import i18n from '@/i18n'
import { useCompositionStore } from '@/stores/composition'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import ProposalControls from '../ProposalControls.vue'
import ProposalOptionsControls from '../ProposalOptionsControls.vue'

const JAPAN = 'japan' as AtlasId
const MAIN = 'JP-MAIN' as TerritoryCode
const RYUKYU = 'JP-RYU' as TerritoryCode

async function openJapanInEnglish() {
  i18n.global.locale.value = 'en'
  await openCompositeWithContours(JAPAN)
}

describe('proposal controls', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the arrangement and the scale of a proposal, and turns them off with a message once a territory is adjusted', async () => {
    await openJapanInEnglish()
    const wrapper = mount(ProposalControls, { global: { plugins: [i18n] }, attachTo: document.body })

    expect(wrapper.text()).toContain('New composition')
    expect(wrapper.text()).not.toContain('Arrangement')

    useCompositionStore().startProposal([MAIN, RYUKYU], { arrangement: 'insets-right', scaleMode: 'readable' })
    await nextTick()

    expect(wrapper.text()).toContain('Arrangement')
    expect(wrapper.text()).toContain('Insets on the right')
    expect(wrapper.text()).not.toContain('Composition adjusted by hand')

    useParameterStore().setTerritoryParameter(RYUKYU, 'scaleMultiplier', 2)
    await nextTick()

    expect(wrapper.text()).toContain('Composition adjusted by hand')
    expect(wrapper.findAll('fieldset button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })

  it('composes the proposal again in the arrangement chosen in the panel', async () => {
    await openJapanInEnglish()
    useCompositionStore().startProposal([MAIN, RYUKYU], { arrangement: 'insets-right', scaleMode: 'readable' })
    const wrapper = mount(ProposalControls, { global: { plugins: [i18n] }, attachTo: document.body })

    wrapper.findComponent(ProposalOptionsControls).vm.$emit('update:arrangement', 'insets-bottom')
    await nextTick()

    expect(usePresetDefaultsStore().proposal).toMatchObject({ codes: [MAIN, RYUKYU], arrangement: 'insets-bottom', scaleMode: 'readable' })
  })
})
