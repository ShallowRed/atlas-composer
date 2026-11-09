import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STATE_DURATION, TRANSITION_DURATION } from '@/config/transitions'

export type AppState
  = | 'idle'
    | 'loading-atlas'
    | 'loading-geodata'
    | 'loading-preset'
    | 'ready'
    | 'switching-view'
    | 'transitioning'
    | 'error'

export const useAppStore = defineStore('app', () => {
  const state = ref<AppState>('idle')
  const isTransitioningWithSplit = ref(false)
  const loadingStartTime = ref<number>(0)
  let readyTimer: ReturnType<typeof setTimeout> | undefined

  function cancelScheduledReady() {
    clearTimeout(readyTimer)
    readyTimer = undefined
  }

  const showSkeleton = computed(() => {
    return state.value === 'idle'
      || state.value === 'loading-atlas'
      || state.value === 'loading-geodata'
      || state.value === 'loading-preset'
  })

  const showSkeletonForViewSwitch = computed(() => {
    if (state.value !== 'switching-view') {
      return false
    }
    return !isTransitioningWithSplit.value
  })

  function startLoadingAtlas() {
    cancelScheduledReady()
    state.value = 'loading-atlas'
    loadingStartTime.value = Date.now()
  }

  function startLoadingGeoData() {
    cancelScheduledReady()
    state.value = 'loading-geodata'
  }

  function startLoadingPreset() {
    cancelScheduledReady()
    state.value = 'loading-preset'
  }

  function setReady() {
    cancelScheduledReady()
    const elapsed = Date.now() - loadingStartTime.value
    const minDisplay = TRANSITION_DURATION.minLoadingDisplay
    const remaining = minDisplay - elapsed

    if (remaining > 0 && loadingStartTime.value > 0) {
      readyTimer = setTimeout(() => {
        state.value = 'ready'
        loadingStartTime.value = 0
      }, remaining)
    }
    else {
      state.value = 'ready'
      loadingStartTime.value = 0
    }
  }

  function startSwitchingView(involvesSplitMode = false) {
    if (state.value !== 'ready') {
      return
    }

    state.value = 'switching-view'
    isTransitioningWithSplit.value = involvesSplitMode

    const durationMs = involvesSplitMode
      ? STATE_DURATION.switchingViewSplit
      : STATE_DURATION.switchingViewOther

    setTimeout(() => {
      if (state.value === 'switching-view') {
        state.value = 'ready'
        isTransitioningWithSplit.value = false
      }
    }, durationMs)
  }

  function setFailed() {
    cancelScheduledReady()
    state.value = 'error'
  }

  return {
    state,
    isTransitioningWithSplit,

    showSkeleton,
    showSkeletonForViewSwitch,

    startLoadingAtlas,
    startLoadingGeoData,
    startLoadingPreset,
    setReady,
    startSwitchingView,
    setFailed,
  }
})
