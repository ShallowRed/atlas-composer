import { ref } from 'vue'

/**
 * Global state tracker for slider interactions
 * Tracks when any slider in the application is being actively dragged
 */

// Global reactive state - shared across all slider instances
const isSliderActive = ref(false)
const activeSliderCount = ref(0)

/**
 * Composable for tracking slider interaction state
 * Used by RangeSlider components to report their active state
 */
export function useSliderState() {
  /**
   * Mark a slider as active (being dragged)
   */
  function setSliderActive() {
    activeSliderCount.value++
    isSliderActive.value = true
  }

  /**
   * Mark a slider as inactive (drag released)
   */
  function setSliderInactive() {
    activeSliderCount.value = Math.max(0, activeSliderCount.value - 1)
    if (activeSliderCount.value === 0) {
      isSliderActive.value = false
    }
  }

  return {
    isSliderActive,
    setSliderActive,
    setSliderInactive,
  }
}
