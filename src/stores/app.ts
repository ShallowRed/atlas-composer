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

export type TransitionType
  = | 'none'
    | 'fade'

export const useAppStore = defineStore('app', () => {
  const state = ref<AppState>('idle')
  const error = ref<string | null>(null)
  const isFirstLoad = ref(true)
  const previousState = ref<AppState>('idle')
  const isTransitioningWithSplit = ref(false)
  const loadingStartTime = ref<number>(0)

  const isLoading = computed(() =>
    state.value === 'loading-atlas'
    || state.value === 'loading-geodata'
    || state.value === 'loading-preset',
  )

  const isReady = computed(() => state.value === 'ready')
  const isTransitioning = computed(() => state.value === 'transitioning')
  const hasError = computed(() => state.value === 'error')

  const showContent = computed(() =>
    state.value === 'ready' || state.value === 'transitioning',
  )

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
    previousState.value = state.value
    state.value = 'loading-atlas'
    loadingStartTime.value = Date.now()
    error.value = null
  }

  function startLoadingGeoData() {
    previousState.value = state.value
    state.value = 'loading-geodata'
  }

  function startLoadingPreset() {
    previousState.value = state.value
    state.value = 'loading-preset'
  }

  function setReady() {
    const elapsed = Date.now() - loadingStartTime.value
    const minDisplay = TRANSITION_DURATION.minLoadingDisplay
    const remaining = minDisplay - elapsed

    if (remaining > 0 && loadingStartTime.value > 0) {
      setTimeout(() => {
        previousState.value = state.value
        state.value = 'ready'
        isFirstLoad.value = false
        loadingStartTime.value = 0
      }, remaining)
    }
    else {
      previousState.value = state.value
      state.value = 'ready'
      isFirstLoad.value = false
      loadingStartTime.value = 0
    }
  }

  function startTransitioning(durationMs = 150) {
    previousState.value = state.value
    state.value = 'transitioning'

    setTimeout(() => {
      if (state.value === 'transitioning') {
        state.value = 'ready'
      }
    }, durationMs)
  }

  function startSwitchingView(involvesSplitMode = false) {
    if (state.value !== 'ready') {
      return
    }

    previousState.value = state.value
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

  function setError(message: string) {
    previousState.value = state.value
    state.value = 'error'
    error.value = message
  }

  function reset() {
    previousState.value = state.value
    state.value = 'idle'
    error.value = null
  }

  function clearError() {
    if (state.value === 'error') {
      state.value = previousState.value === 'error' ? 'idle' : previousState.value
      error.value = null
    }
  }

  return {
    state,
    error,
    isFirstLoad,
    previousState,
    isTransitioningWithSplit,

    isLoading,
    isReady,
    isTransitioning,
    hasError,
    showContent,
    showSkeleton,
    showSkeletonForViewSwitch,

    startLoadingAtlas,
    startLoadingGeoData,
    startLoadingPreset,
    setReady,
    startTransitioning,
    startSwitchingView,
    setError,
    reset,
    clearError,
  }
})
