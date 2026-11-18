import type { AxisControl } from '@/core/parameters'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { parameterRegistry } from '@/core/parameters'
import i18n from '@/i18n'
import ParameterInput from '../ParameterInput.vue'

function mountInput(control: AxisControl) {
  return mount(ParameterInput, { props: { label: 'Value', control, modelValue: 1 }, global: { plugins: [i18n] } })
}

describe('parameter input', () => {
  it('adds a track to the field when the metric has one', () => {
    const [scaleMultiplier] = parameterRegistry.getAxisControls('scaleMultiplier', 'CONIC')!
    expect(mountInput(scaleMultiplier!).find('input[type="range"]').exists()).toBe(true)
  })

  it('shows the field alone for a length of the canvas', () => {
    const [offset] = parameterRegistry.getAxisControls('translateOffset', 'CONIC')!
    const wrapper = mountInput(offset!)
    expect(wrapper.find('input[type="range"]').exists()).toBe(false)
    expect(wrapper.find('[role="spinbutton"]').exists()).toBe(true)
  })

  it('passes a value of the track on', async () => {
    const [scaleMultiplier] = parameterRegistry.getAxisControls('scaleMultiplier', 'CONIC')!
    const wrapper = mountInput(scaleMultiplier!)
    await wrapper.find('input[type="range"]').setValue('750')
    expect(wrapper.emitted('update:modelValue')).toEqual([[4.47]])
  })
})
