import type { AtlasId, TerritoryCode } from '@/types/branded'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { openCompositeWithContours } from '@/__tests__/composite-utils'
import i18n from '@/i18n'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import NewCompositionModal from '../NewCompositionModal.vue'

const MAIN = 'JP-MAIN' as TerritoryCode
const RYUKYU = 'JP-RYU' as TerritoryCode

async function openInEnglish(atlasId: string) {
  i18n.global.locale.value = 'en'
  await openCompositeWithContours(atlasId as AtlasId)
}

const buttonNamed = (name: string) => [...document.body.querySelectorAll('button')].find(button => button.textContent?.trim() === name)
const checkboxesIn = (element: ParentNode) => [...element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]

describe('new composition window', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('composes the checked territories with the chosen options, and composes nothing with no territory checked', async () => {
    await openInEnglish('japan')
    const wrapper = mount(NewCompositionModal, { props: { 'modelValue': false, 'onUpdate:modelValue': (open: boolean) => wrapper.setProps({ modelValue: open }) }, global: { plugins: [i18n] }, attachTo: document.body })
    await wrapper.setProps({ modelValue: true })

    expect(buttonNamed('Compose')!.disabled).toBe(true)
    expect(document.body.textContent).toContain('No territory checked')

    const checkboxes = checkboxesIn(document.body)
    const checkboxNamed = (name: string) => checkboxes.find(checkbox => checkbox.closest('label')!.textContent!.trim() === name)!
    checkboxNamed('Honshu, Shikoku and Kyushu').click()
    checkboxNamed('Ryukyu Islands').click()
    await nextTick()

    expect(document.body.textContent).toContain('2 territories checked')
    buttonNamed('Compose')!.click()
    await nextTick()

    expect(usePresetDefaultsStore().proposal).toMatchObject({ codes: expect.arrayContaining([MAIN, RYUKYU]), arrangement: 'insets-right', scaleMode: 'readable' })
    expect(wrapper.props('modelValue')).toBe(false)
  })

  it('checks and unchecks the territories of one group and leaves the other groups as they are', async () => {
    await openInEnglish('france')
    mount(NewCompositionModal, { props: { modelValue: true }, global: { plugins: [i18n] }, attachTo: document.body })
    await nextTick()
    const groups = [...document.body.querySelectorAll('section')]
    const group = groups.find(section => checkboxesIn(section).length > 1)!
    const others = groups.filter(section => section !== group)

    group.querySelector('button')!.click()
    await nextTick()

    expect(checkboxesIn(group).every(checkbox => checkbox.checked)).toBe(true)
    expect(others.flatMap(checkboxesIn).some(checkbox => checkbox.checked)).toBe(false)
    expect(group.querySelector('button')!.textContent!.trim()).toBe('Uncheck all')

    group.querySelector('button')!.click()
    await nextTick()
    expect(checkboxesIn(document.body).some(checkbox => checkbox.checked)).toBe(false)
  })

  it('offers no group button for a group of one territory', async () => {
    await openInEnglish('france')
    mount(NewCompositionModal, { props: { modelValue: true }, global: { plugins: [i18n] }, attachTo: document.body })
    await nextTick()
    const single = [...document.body.querySelectorAll('section')].filter(section => checkboxesIn(section).length === 1)

    expect(single.length).toBeGreaterThan(0)
    expect(single.every(section => section.querySelector('button') === null)).toBe(true)
  })
})
