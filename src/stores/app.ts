/**
 * App Store - Centralized application lifecycle state management
 *
 * Replaces scattered boolean flags (isReinitializing, isInitialized, isLoading)
 * with explicit state machine using Pinia.
 *
 * State Flow:
 * ```
 * idle
 *   ↓ (SELECT_ATLAS)
 * loading-atlas
 *   ↓ (ATLAS_LOADED)
 * loading-geodata
 *   ↓ (GEODATA_LOADED)
 * loading-preset
 *   ↓ (PRESET_LOADED)
 * ready
 *   ↓ (CHANGE_VIEW_MODE | CHANGE_PRESET | SELECT_ATLAS)
 * transitioning → ready
 *   ↓ (ERROR at any step)
 * error
 * ```
 *
 * Benefits:
 * - Single source of truth for app lifecycle
 * - Vue Transition coordination via computed properties
 * - Clear state for debugging ("what state is the app in?")
 * - No race conditions from scattered flags
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STATE_DURATION, TRANSITION_DURATION } from '@/config/transitions'

/**
 * Application lifecycle states
 */
export type AppState
  = | 'idle' // Initial state, no atlas selected
    | 'loading-atlas' // Loading atlas configuration
    | 'loading-geodata' // Loading geographic data
    | 'loading-preset' // Loading and applying preset
    | 'ready' // Atlas loaded, ready for interaction
    | 'switching-view' // Brief skeleton display during view mode switch
    | 'transitioning' // Brief transition for view mode/preset changes
    | 'error' // Error occurred during initialization

/**
 * Transition types for Vue components
 */
export type TransitionType
  = | 'none' // No transition (instant)
    | 'fade' // Standard fade

export const useAppStore = defineStore('app', () => {

  /**
   * Current application state
   */
  const state = ref<AppState>('idle')

  /**
   * Error message when in error state
   */
  const error = ref<string | null>(null)

  /**
   * Whether this is the first load (affects transition type)
   */
  const isFirstLoad = ref(true)

  /**
   * Previous state for transition logic
   */
  const previousState = ref<AppState>('idle')

  /**
   * Whether current transition involves split mode (no skeleton in that case)
   */
  const isTransitioningWithSplit = ref(false)

  /**
   * Timestamp when loading started (for minimum skeleton display time)
   */
  const loadingStartTime = ref<number>(0)

  // Computed - State Checks

  /**
   * Whether app is in any loading state
   */
  const isLoading = computed(() =>
    state.value === 'loading-atlas'
    || state.value === 'loading-geodata'
    || state.value === 'loading-preset',
  )

  /**
   * Whether app is ready for user interaction
   */
  const isReady = computed(() => state.value === 'ready')

  /**
   * Whether app is transitioning between states
   */
  const isTransitioning = computed(() => state.value === 'transitioning')

  /**
   * Whether app has an error
   */
  const hasError = computed(() => state.value === 'error')

  /**
   * Whether content should be shown (ready or transitioning)
   */
  const showContent = computed(() =>
    state.value === 'ready' || state.value === 'transitioning',
  )

  /**
   * Whether skeleton/loading placeholder should be shown
   * Used for initial load and atlas switches, NOT for view mode switches
   */
  const showSkeleton = computed(() => {
    return state.value === 'idle'
      || state.value === 'loading-atlas'
      || state.value === 'loading-geodata'
      || state.value === 'loading-preset'
  })

  /**
   * Whether to show skeleton during view mode switching
   * For split mode: never (direct content transition)
   * For other modes: yes (brief skeleton display)
   */
  const showSkeletonForViewSwitch = computed(() => {
    if (state.value !== 'switching-view') {
      return false
    }
    return !isTransitioningWithSplit.value
  })

  // Actions - State Transitions

  /**
   * Transition to loading-atlas state
   * Note: Preserves isTransitioningWithSplit if already in a view switch
   */
  function startLoadingAtlas() {
    previousState.value = state.value
    state.value = 'loading-atlas'
    loadingStartTime.value = Date.now()
    error.value = null
  }

  /**
   * Transition to loading-geodata state
   */
  function startLoadingGeoData() {
    previousState.value = state.value
    state.value = 'loading-geodata'
  }

  /**
   * Transition to loading-preset state
   */
  function startLoadingPreset() {
    previousState.value = state.value
    state.value = 'loading-preset'
  }

  /**
   * Transition to ready state
   * Enforces minimum skeleton display time for smooth visual experience
   * Note: If isTransitioningWithSplit is true, the timeout will handle cleanup
   */
  function setReady() {
    // Calculate how long skeleton has been visible
    const elapsed = Date.now() - loadingStartTime.value
    const minDisplay = TRANSITION_DURATION.minLoadingDisplay
    const remaining = minDisplay - elapsed

    if (remaining > 0 && loadingStartTime.value > 0) {
      // Delay setReady to ensure minimum skeleton display time
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
    // Note: isTransitioningWithSplit is cleared by the timeout in startSwitchingView
  }

  /**
   * Transition to transitioning state (for quick UI updates)
   * Automatically returns to ready after a brief delay
   */
  function startTransitioning(durationMs = 150) {
    previousState.value = state.value
    state.value = 'transitioning'

    // Auto-return to ready after transition
    setTimeout(() => {
      if (state.value === 'transitioning') {
        state.value = 'ready'
      }
    }, durationMs)
  }

  /**
   * Transition to switching-view state (shows skeleton during view mode change)
   * Automatically returns to ready after skeleton displays briefly
   * @param involvesSplitMode - If true, skeleton won't show (split mode has multiple renderers)
   */
  function startSwitchingView(involvesSplitMode = false) {
    if (state.value !== 'ready') {
      return // Only switch from ready state
    }

    previousState.value = state.value
    state.value = 'switching-view'
    isTransitioningWithSplit.value = involvesSplitMode

    // Duration from centralized config
    const durationMs = involvesSplitMode
      ? STATE_DURATION.switchingViewSplit
      : STATE_DURATION.switchingViewOther

    // Return to ready after transition completes
    setTimeout(() => {
      if (state.value === 'switching-view') {
        state.value = 'ready'
        isTransitioningWithSplit.value = false
      }
    }, durationMs)
  }

  /**
   * Transition to error state
   */
  function setError(message: string) {
    previousState.value = state.value
    state.value = 'error'
    error.value = message
  }

  /**
   * Reset to idle state
   */
  function reset() {
    previousState.value = state.value
    state.value = 'idle'
    error.value = null
  }

  /**
   * Clear error and return to previous state or idle
   */
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

    // Computed - State checks
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
