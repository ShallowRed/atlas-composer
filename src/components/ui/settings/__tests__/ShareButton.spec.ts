import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ShareButton from '../ShareButton.vue'

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'share.button': 'Share',
        'share.copied': 'Copied!',
        'share.error': 'Failed to copy',
      }
      return translations[key] || key
    },
  }),
}))

// Mock useUrlState
vi.mock('@/composables/useUrlState', () => ({
  useUrlState: vi.fn(),
}))

describe('shareButton', () => {
  let mockCopyShareableUrl: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    setActivePinia(createPinia())

    // Setup mocks
    mockCopyShareableUrl = vi.fn()

    const useUrlStateModule = await import('@/composables/useUrlState')
    vi.mocked(useUrlStateModule.useUrlState).mockReturnValue({
      shareableUrl: { value: 'https://example.com?atlas=france&view=split' } as any,
      copyShareableUrl: mockCopyShareableUrl,
      serializeState: vi.fn(),
      deserializeState: vi.fn(),
      updateUrl: vi.fn(),
      restoreFromUrl: vi.fn(),
      enableAutoSync: vi.fn(),
    })

    // Mock setTimeout
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render with default state', () => {
    const wrapper = mount(ShareButton)

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('.ri-share-line').exists()).toBe(true)
    expect(wrapper.text()).toContain('Share')
  })

  it('should call copyShareableUrl when clicked', async () => {
    mockCopyShareableUrl.mockResolvedValue(true)
    const wrapper = mount(ShareButton)

    await wrapper.find('button').trigger('click')

    expect(mockCopyShareableUrl).toHaveBeenCalledTimes(1)
  })

  it('should show success state after successful copy', async () => {
    mockCopyShareableUrl.mockResolvedValue(true)
    const wrapper = mount(ShareButton)

    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(wrapper.find('.btn-success').exists()).toBe(true)
    expect(wrapper.find('.ri-check-line').exists()).toBe(true)
    expect(wrapper.text()).toContain('Copied!')
  })

  it('should reset to default state after 2 seconds', async () => {
    mockCopyShareableUrl.mockResolvedValue(true)
    const wrapper = mount(ShareButton)

    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(wrapper.find('.btn-success').exists()).toBe(true)

    // Fast-forward 2 seconds
    vi.advanceTimersByTime(2000)
    await nextTick()

    expect(wrapper.find('.btn-success').exists()).toBe(false)
    expect(wrapper.find('.ri-share-line').exists()).toBe(true)
    expect(wrapper.text()).toContain('Share')
  })

  it('should show error state after failed copy', async () => {
    mockCopyShareableUrl.mockResolvedValue(false)
    const wrapper = mount(ShareButton)

    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(wrapper.find('.btn-error').exists()).toBe(true)
    expect(wrapper.find('.ri-error-warning-line').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to copy')
  })

  it('should reset error state after 3 seconds', async () => {
    mockCopyShareableUrl.mockResolvedValue(false)
    const wrapper = mount(ShareButton)

    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(wrapper.find('.btn-error').exists()).toBe(true)

    // Fast-forward 3 seconds
    vi.advanceTimersByTime(3000)
    await nextTick()

    expect(wrapper.find('.btn-error').exists()).toBe(false)
    expect(wrapper.find('.ri-share-line').exists()).toBe(true)
    expect(wrapper.text()).toContain('Share')
  })

  it('should clear previous timeout when clicked again', async () => {
    mockCopyShareableUrl.mockResolvedValue(true)
    const wrapper = mount(ShareButton)

    // First click
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.find('.btn-success').exists()).toBe(true)

    // Advance time by 1 second
    vi.advanceTimersByTime(1000)

    // Second click before timeout
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Should still show success
    expect(wrapper.find('.btn-success').exists()).toBe(true)

    // Advance time by 2 more seconds (total 3 seconds from second click)
    vi.advanceTimersByTime(2000)
    await nextTick()

    // Should reset now (based on second click timing)
    expect(wrapper.find('.btn-success').exists()).toBe(false)
  })

  it('should handle rapid clicks', async () => {
    mockCopyShareableUrl.mockResolvedValue(true)
    const wrapper = mount(ShareButton)

    // Multiple rapid clicks
    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Should have called copyShareableUrl 3 times
    expect(mockCopyShareableUrl).toHaveBeenCalledTimes(3)

    // Should still be in success state
    expect(wrapper.find('.btn-success').exists()).toBe(true)
  })
})
