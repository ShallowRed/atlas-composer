import type { AxisControl } from '@/core/parameters'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { parameterRegistry } from '@/core/parameters'
import i18n from '@/i18n'
import NumberField from '../NumberField.vue'

const [longitude, latitude] = parameterRegistry.getAxisControls('rotate', 'CONIC')!
const [scaleMultiplier] = parameterRegistry.getAxisControls('scaleMultiplier', 'CONIC')!

function mountField(control: AxisControl, modelValue: number, limits?: { min?: number, max?: number }) {
  return mount(NumberField, { props: { label: 'Value', control, modelValue, limits }, global: { plugins: [i18n] } })
}

function emitted(wrapper: ReturnType<typeof mountField>): number[] {
  return (wrapper.emitted('update:modelValue') ?? []).map(([value]) => value as number)
}

describe('number field', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('shows the stored value with every decimal of its writing', () => {
    expect((mountField(latitude!, -46.235).find('input').element as HTMLInputElement).value).toBe('-46.235')
  })

  it('writes the decimal separator of the interface language', () => {
    i18n.global.locale.value = 'fr'
    expect((mountField(latitude!, -46.2).find('input').element as HTMLInputElement).value).toBe('-46,2')
  })

  it('reads a typed value and wraps a longitude', async () => {
    const wrapper = mountField(longitude!, 0)
    const input = wrapper.find('input')
    await input.setValue('190')
    await input.trigger('keydown', { key: 'Enter' })
    expect(emitted(wrapper)).toEqual([-170])
  })

  it('rounds a typed value to the writing, never to the step', async () => {
    const wrapper = mountField(scaleMultiplier!, 1)
    const input = wrapper.find('input')
    await input.setValue('1.23456')
    await input.trigger('blur')
    expect(emitted(wrapper)).toEqual([1.23])
  })

  it('keeps the value when the text is not a number', async () => {
    const wrapper = mountField(latitude!, 10)
    const input = wrapper.find('input')
    await input.setValue('abc')
    await input.trigger('blur')
    expect(emitted(wrapper)).toEqual([])
    expect((input.element as HTMLInputElement).value).toBe('10')
  })

  it('steps with the arrows, by ten with Shift', async () => {
    const wrapper = mountField(latitude!, 10)
    await wrapper.find('input').trigger('keydown', { key: 'ArrowUp' })
    await wrapper.find('input').trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(emitted(wrapper)).toEqual([10.1, 9])
  })

  it('stops at the limit that the facing axis sets', async () => {
    const wrapper = mountField(latitude!, 59.95, { max: 60 })
    await wrapper.find('input').trigger('keydown', { key: 'ArrowUp' })
    expect(emitted(wrapper)).toEqual([60])
  })

  it('gives the typed text up with Escape', async () => {
    const wrapper = mountField(latitude!, 10)
    const input = wrapper.find('input')
    await input.setValue('20')
    await input.trigger('keydown', { key: 'Escape' })
    await input.trigger('blur')
    expect(emitted(wrapper)).toEqual([])
  })
})
