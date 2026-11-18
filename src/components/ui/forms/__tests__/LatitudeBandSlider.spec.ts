import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { parameterRegistry } from '@/core/parameters'
import i18n from '@/i18n'
import LatitudeBandSlider from '../LatitudeBandSlider.vue'

const [parallel] = parameterRegistry.getAxisControls('parallels', 'CONIC')!

function mountSlider(modelValue: [number, number]) {
  const wrapper = mount(LatitudeBandSlider, { props: { control: parallel!, modelValue, band: [41, 51] }, global: { plugins: [i18n] }, attachTo: document.body })
  const track = wrapper.find('.touch-none')
  // The track spans from 36 to 56 degrees for parallels inside the band
  track.element.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 20, right: 200, bottom: 20, x: 0, y: 0, toJSON: () => ({}) })
  track.element.setPointerCapture = () => {}
  track.element.hasPointerCapture = () => true
  track.element.releasePointerCapture = () => {}
  return { wrapper, track }
}

describe('latitude band slider', () => {
  it('marks the band of the territories', () => {
    const { wrapper } = mountSlider([44, 49])
    expect(wrapper.find('.latitude-band').attributes('style')).toContain('left: 25%')
  })

  it('moves the parallel nearest to the pointer', async () => {
    const { wrapper, track } = mountSlider([44, 49])
    await track.trigger('pointerdown', { clientX: 60, pointerId: 1 })
    expect(wrapper.emitted('update:modelValue')).toEqual([[[42, 49]]])
  })

  it('keeps the south parallel below the north one', async () => {
    const { wrapper, track } = mountSlider([44, 49])
    await track.trigger('pointerdown', { clientX: 90, pointerId: 1 })
    await track.trigger('pointermove', { clientX: 180, pointerId: 1 })
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([[48.99, 49]])
  })

  it('stays out of the accessibility tree, where the two fields take the input', () => {
    expect(mountSlider([44, 49]).wrapper.attributes('aria-hidden')).toBe('true')
  })
})
