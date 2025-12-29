<script setup lang="ts">
/**
 * Global Projection Controls
 *
 * Component for editing global projection settings that apply across all territories:
 * - Canvas Dimensions: Reference canvas size for projection scaling
 * - Reference Scale: Base scale value used across all territories
 *
 * These settings are stored in presets and can be exported/imported.
 */

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import { useProjectionStore } from '@/stores/projection'

const { t } = useI18n()
const projectionStore = useProjectionStore()

// Default values (d3-composite-projections standard)
const DEFAULT_CANVAS_WIDTH = 960
const DEFAULT_CANVAS_HEIGHT = 500
const DEFAULT_REFERENCE_SCALE = 2700 // For single-focus pattern

// Ranges for controls
const CANVAS_WIDTH_RANGE = { min: 500, max: 2000, step: 10 }
const CANVAS_HEIGHT_RANGE = { min: 300, max: 1200, step: 10 }
const REFERENCE_SCALE_RANGE = { min: 100, max: 10000, step: 50 }

// Local state for canvas dimensions
const canvasWidth = ref(projectionStore.canvasDimensions?.width ?? DEFAULT_CANVAS_WIDTH)
const canvasHeight = ref(projectionStore.canvasDimensions?.height ?? DEFAULT_CANVAS_HEIGHT)
const aspectRatioLocked = ref(true)

// Local state for reference scale
const referenceScale = ref(projectionStore.referenceScale ?? DEFAULT_REFERENCE_SCALE)

// Track original aspect ratio
const originalAspectRatio = computed(() => {
  const width = projectionStore.canvasDimensions?.width ?? DEFAULT_CANVAS_WIDTH
  const height = projectionStore.canvasDimensions?.height ?? DEFAULT_CANVAS_HEIGHT
  return width / height
})

// Watch for external changes to projection store
watch(() => projectionStore.canvasDimensions, (newDimensions) => {
  if (newDimensions) {
    canvasWidth.value = newDimensions.width
    canvasHeight.value = newDimensions.height
  }
}, { immediate: true })

watch(() => projectionStore.referenceScale, (newScale) => {
  if (newScale !== undefined) {
    referenceScale.value = newScale
  }
}, { immediate: true })

// Update functions with aspect ratio lock support
function updateCanvasWidth(value: number) {
  canvasWidth.value = value

  if (aspectRatioLocked.value) {
    // Maintain aspect ratio by adjusting height
    canvasHeight.value = Math.round(value / originalAspectRatio.value)
  }

  applyCanvasDimensions()
}

function updateCanvasHeight(value: number) {
  canvasHeight.value = value

  if (aspectRatioLocked.value) {
    // Maintain aspect ratio by adjusting width
    canvasWidth.value = Math.round(value * originalAspectRatio.value)
  }

  applyCanvasDimensions()
}

function updateReferenceScale(value: number) {
  referenceScale.value = value
  applyReferenceScale()
}

// Apply changes to projection store
function applyCanvasDimensions() {
  // Always create a new object to ensure reactivity is triggered
  projectionStore.canvasDimensions = {
    width: canvasWidth.value,
    height: canvasHeight.value,
  }

  // Note: Canvas dimensions control the SVG viewport size
  // and are used by MapSizeCalculator to determine display dimensions
}

function applyReferenceScale() {
  projectionStore.referenceScale = referenceScale.value

  // Note: Reference scale changes are picked up by the composite projection
  // through reactive watchers - no full reinitialization needed
}

// Reset to defaults
function resetToDefaults() {
  canvasWidth.value = DEFAULT_CANVAS_WIDTH
  canvasHeight.value = DEFAULT_CANVAS_HEIGHT
  referenceScale.value = DEFAULT_REFERENCE_SCALE
  aspectRatioLocked.value = true

  applyCanvasDimensions()
  applyReferenceScale()
}

// Compute aspect ratio display
const aspectRatio = computed(() => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(canvasWidth.value, canvasHeight.value)
  const ratioWidth = canvasWidth.value / divisor
  const ratioHeight = canvasHeight.value / divisor
  return `${ratioWidth}:${ratioHeight}`
})

// Check if values differ from defaults
const hasCustomValues = computed(() => {
  return canvasWidth.value !== DEFAULT_CANVAS_WIDTH
    || canvasHeight.value !== DEFAULT_CANVAS_HEIGHT
    || referenceScale.value !== DEFAULT_REFERENCE_SCALE
})
</script>

<template>
  <div class="space-y-4">
    <!-- Reset Button -->
    <button
      :disabled="!hasCustomValues"
      class="btn btn-soft btn-sm w-full"
      @click="resetToDefaults"
    >
      <i class="ri-refresh-line mr-1" />
      {{ t('projectionControls.global.resetToDefaults') }}
    </button>

    <!-- Canvas Dimensions Section -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <!-- Aspect Ratio Lock Toggle -->
        <ToggleControl
          v-model="aspectRatioLocked"
          :label="t('projectionControls.global.lockAspectRatio')"
          icon="i-carbon-locked"
          size="xs"
        />
        <span class="badge badge-sm badge-ghost">
          {{ aspectRatio }}
        </span>
      </div>

      <!-- Canvas Width -->
      <RangeSlider
        :model-value="canvasWidth"
        :label="t('projectionControls.global.canvasWidth')"
        icon="i-carbon-row"
        :min="CANVAS_WIDTH_RANGE.min"
        :max="CANVAS_WIDTH_RANGE.max"
        :step="CANVAS_WIDTH_RANGE.step"
        unit="px"
        color="primary"
        size="xs"
        @update:model-value="updateCanvasWidth"
      />
      <!-- Canvas Height -->
      <RangeSlider
        :model-value="canvasHeight"
        :label="t('projectionControls.global.canvasHeight')"
        icon="i-carbon-column"
        :min="CANVAS_HEIGHT_RANGE.min"
        :max="CANVAS_HEIGHT_RANGE.max"
        :step="CANVAS_HEIGHT_RANGE.step"
        unit="px"
        color="primary"
        size="xs"
        @update:model-value="updateCanvasHeight"
      />
      <!-- Reference Scale -->
      <RangeSlider
        :model-value="referenceScale"
        :label="t('projectionControls.global.scaleValue')"
        icon="i-carbon-zoom-in"
        :min="REFERENCE_SCALE_RANGE.min"
        :max="REFERENCE_SCALE_RANGE.max"
        :step="REFERENCE_SCALE_RANGE.step"
        color="secondary"
        size="xs"
        @update:model-value="updateReferenceScale"
      />
    </div>
  </div>
</template>
