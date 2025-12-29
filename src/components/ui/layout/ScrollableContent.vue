<script setup lang="ts">
import { useMutationObserver, useResizeObserver, useScroll } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'

interface Props {
  /**
   * Show gradient overlay when content overflows
   */
  showGradient?: boolean
  gradientColor?: string
}

withDefaults(defineProps<Props>(), {
  showGradient: true,
  gradientColor: 'white',
})

const scrollContainerRef = ref<HTMLElement>()

// Track if content actually overflows the container
const hasScrollableContent = ref(false)

// Use VueUse's useScroll to track scroll state and get measure function
const { arrivedState, measure } = useScroll(scrollContainerRef, {
  offset: { bottom: 1 }, // Small offset to detect if we're really at the bottom
})

// Check if content overflows and update state
function checkOverflow() {
  if (!scrollContainerRef.value) {
    hasScrollableContent.value = false
    return
  }
  const el = scrollContainerRef.value
  hasScrollableContent.value = el.scrollHeight > el.clientHeight
  measure()
}

// Watch for size changes to remeasure
useResizeObserver(scrollContainerRef, () => {
  checkOverflow()
})

// Watch for content changes (children added/removed) to remeasure
useMutationObserver(
  scrollContainerRef,
  () => {
    nextTick(() => checkOverflow())
  },
  { childList: true, subtree: true },
)

// Also measure after the component is mounted and on any re-renders
watch(scrollContainerRef, () => {
  nextTick(() => checkOverflow())
}, { immediate: true })

const hasOverflowBottom = computed(() => {
  // Must have scrollable content AND not be at the bottom
  return hasScrollableContent.value && !arrivedState.bottom
})

const hasOverflowTop = computed(() => {
  // Must have scrollable content AND not be at the top
  return hasScrollableContent.value && !arrivedState.top
})
</script>

<template>
  <div
    :style="{
      '--gradient-color': gradientColor,
    }"
    class="scrollable-content"
    :class="{
      'scrollable-content--has-overflow-bottom': hasOverflowBottom && showGradient,
      'scrollable-content--has-overflow-top': hasOverflowTop && showGradient,
    }"
  >
    <div
      ref="scrollContainerRef"
      class="scrollable-content__container"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scrollable-content {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for flex children to shrink */
  height: 100%;
}

.scrollable-content__container {
  overflow-y: auto;
  flex: 1;
}

/* Gradient pseudo-elements - always present but opacity controlled */
.scrollable-content::after,
.scrollable-content::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2rem;
  pointer-events: none;
  z-index: 10;
  opacity: 0;
  transition: opacity var(--transition-fade) ease;
}

.scrollable-content::after {
  bottom: 0;
  background: linear-gradient(to bottom, transparent, var(--gradient-color));
}

.scrollable-content::before {
  top: 0;
  background: linear-gradient(to top, transparent, var(--gradient-color));
}

/* Show gradients when overflow is detected */
.scrollable-content--has-overflow-bottom::after {
  opacity: 1;
}

.scrollable-content--has-overflow-top::before {
  opacity: 1;
}
</style>
