import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RangeSlider from '../RangeSlider.vue'

function mountSlider(props: { modelValue: number, step: number, min?: number, max?: number, unit?: string, showMidpoint?: boolean }) {
  return mount(RangeSlider, { props: { label: 'Value', min: -10, max: 10, ...props } })
}

function labelOf(props: { modelValue: number, step: number, unit?: string }) {
  return mountSlider(props).find('.label-text').text()
}

describe('rangeSlider', () => {
  it('shows two decimals with a step of 0.01', () => {
    expect(labelOf({ modelValue: 0.5, step: 0.01, unit: '×' })).toBe('Value: 0.50×')
  })

  it('shows one decimal with a step of 0.5', () => {
    expect(labelOf({ modelValue: 1.5, step: 0.5, unit: '°' })).toBe('Value: 1.5°')
  })

  it('shows no decimal with a step of 1', () => {
    expect(labelOf({ modelValue: 2.6, step: 1 })).toBe('Value: 3')
  })

  it('shows the bounds and the midpoint without the decimals of the step', () => {
    const wrapper = mountSlider({ modelValue: 0, step: 0.5, min: -180, max: 180, unit: '°', showMidpoint: true })
    const bounds = wrapper.findAll('.justify-between span').map(span => span.text())
    expect(bounds).toEqual(['-180°', '0°', '180°'])
  })
})
