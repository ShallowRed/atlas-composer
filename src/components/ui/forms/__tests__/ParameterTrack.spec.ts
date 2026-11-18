import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { parameterRegistry } from '@/core/parameters'
import i18n from '@/i18n'
import ParameterTrack from '../ParameterTrack.vue'

const [scaleMultiplier] = parameterRegistry.getAxisControls('scaleMultiplier', 'CONIC')!

function mountTrack(modelValue: number) {
  return mount(ParameterTrack, { props: { label: 'Scale', control: scaleMultiplier!, modelValue }, global: { plugins: [i18n] } })
}

describe('parameter track', () => {
  it('places the neutral ratio in the middle of a logarithmic track', () => {
    expect(mountTrack(1).find('input').element.value).toBe('500')
  })

  it('snaps to the detent near the neutral ratio', async () => {
    const wrapper = mountTrack(2)
    await wrapper.find('input').setValue('508')
    expect(wrapper.emitted('update:modelValue')).toEqual([[1]])
  })

  it('keeps a value outside the track until a gesture on it', () => {
    const wrapper = mountTrack(30)
    expect(wrapper.find('input').element.value).toBe('1000')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('labels its ticks with the symbol of the axis', () => {
    expect(mountTrack(1).findAll('span').map(span => span.text())).toEqual(['0.1×', '1×', '10×'])
  })
})
