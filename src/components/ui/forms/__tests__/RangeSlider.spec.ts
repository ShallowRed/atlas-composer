import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RangeSlider from '../RangeSlider.vue'

function labelOf(props: { modelValue: number, step: number, unit?: string }) {
  const wrapper = mount(RangeSlider, { props: { label: 'Value', min: -10, max: 10, ...props } })
  return wrapper.find('.label-text').text()
}

describe('rangeSlider', () => {
  it.fails('shows two decimals with a step of 0.01', () => {
    expect(labelOf({ modelValue: 0.5, step: 0.01, unit: '×' })).toBe('Value: 0.50×')
  })

  it.fails('shows one decimal with a step of 0.5', () => {
    expect(labelOf({ modelValue: 1.5, step: 0.5, unit: '°' })).toBe('Value: 1.5°')
  })

  it('shows no decimal with a step of 1', () => {
    expect(labelOf({ modelValue: 3, step: 1 })).toBe('Value: 3')
  })
})
