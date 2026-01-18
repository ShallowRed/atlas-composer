import { ref } from 'vue'

const isSliderActive = ref(false)
const activeSliderCount = ref(0)

export function useSliderState() {
  function setSliderActive() {
    activeSliderCount.value++
    isSliderActive.value = true
  }

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
