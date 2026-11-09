import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRANSITION_DURATION } from '@/config/transitions'
import { useAppStore } from '@/stores/app'

describe('app store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function scheduleReady() {
    const appStore = useAppStore()
    appStore.startLoadingAtlas()
    appStore.setReady()
    return appStore
  }

  it('becomes ready after the minimum display of the loading state', () => {
    const appStore = scheduleReady()

    expect(appStore.state).toBe('loading-atlas')
    vi.advanceTimersByTime(TRANSITION_DURATION.minLoadingDisplay)

    expect(appStore.state).toBe('ready')
  })

  it.each([
    ['startLoadingAtlas', 'loading-atlas'],
    ['startLoadingGeoData', 'loading-geodata'],
    ['startLoadingPreset', 'loading-preset'],
    ['setFailed', 'error'],
  ] as const)('keeps the state of %s over a scheduled ready', (action, state) => {
    const appStore = scheduleReady()

    appStore[action]()
    vi.advanceTimersByTime(TRANSITION_DURATION.minLoadingDisplay)

    expect(appStore.state).toBe(state)
  })
})
