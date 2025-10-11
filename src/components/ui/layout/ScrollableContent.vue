<script setup lang="ts">
import { useResizeObserver, useScroll } from '@vueuse/core'
import { computed, ref } from 'vue'

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

// Use VueUse's useScroll to track scroll state and get measure function
const { arrivedState, measure } = useScroll(scrollContainerRef, {
  offset: { bottom: 1 }, // Small offset to detect if we're really at the bottom
})

// Also watch for size changes to remeasure
useResizeObserver(scrollContainerRef, () => {
  measure()
})

const hasOverflowBottom = computed(() => {
  // Overflow exists if we're not at the bottom (meaning there's more content below)
  return !arrivedState.bottom
})

const hasOverflowTop = computed(() => {
  return !arrivedState.top
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

.scrollable-content--has-overflow-bottom::after,
.scrollable-content--has-overflow-top::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2rem;
  pointer-events: none;
  z-index: 10;
}

.scrollable-content--has-overflow-bottom::after {
  bottom: 0;
  background: linear-gradient(to bottom, transparent, var(--gradient-color));
}

.scrollable-content--has-overflow-top::before {
  top: 0;
  background: linear-gradient(to top, transparent, var(--gradient-color));
}
</style>
