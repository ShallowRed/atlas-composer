<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import { useProjectionStore } from '@/stores/projection'

const { t } = useI18n()
const projectionStore = useProjectionStore()

const DEFAULT_CANVAS_WIDTH = 960
const DEFAULT_CANVAS_HEIGHT = 500
const DEFAULT_REFERENCE_SCALE = 2700

const CANVAS_WIDTH_RANGE = { min: 500, max: 2000, step: 10 }
const CANVAS_HEIGHT_RANGE = { min: 300, max: 1200, step: 10 }
const REFERENCE_SCALE_RANGE = { min: 100, max: 10000, step: 50 }

const canvasWidth = ref(projectionStore.canvasDimensions?.width ?? DEFAULT_CANVAS_WIDTH)
const canvasHeight = ref(projectionStore.canvasDimensions?.height ?? DEFAULT_CANVAS_HEIGHT)
const aspectRatioLocked = ref(true)

const referenceScale = ref(projectionStore.referenceScale ?? DEFAULT_REFERENCE_SCALE)
const originalAspectRatio = computed(() => {
  const width = projectionStore.canvasDimensions?.width ?? DEFAULT_CANVAS_WIDTH
  const height = projectionStore.canvasDimensions?.height ?? DEFAULT_CANVAS_HEIGHT
  return width / height
})

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

function updateCanvasWidth(value: number) {
  canvasWidth.value = value

  if (aspectRatioLocked.value) {
    canvasHeight.value = Math.round(value / originalAspectRatio.value)
  }

  applyCanvasDimensions()
}

function updateCanvasHeight(value: number) {
  canvasHeight.value = value

  if (aspectRatioLocked.value) {
    canvasWidth.value = Math.round(value * originalAspectRatio.value)
  }

  applyCanvasDimensions()
}

function updateReferenceScale(value: number) {
  referenceScale.value = value
  applyReferenceScale()
}

function applyCanvasDimensions() {
  projectionStore.canvasDimensions = {
    width: canvasWidth.value,
    height: canvasHeight.value,
  }
}

function applyReferenceScale() {
  projectionStore.referenceScale = referenceScale.value
}

function resetToDefaults() {
  canvasWidth.value = DEFAULT_CANVAS_WIDTH
  canvasHeight.value = DEFAULT_CANVAS_HEIGHT
  referenceScale.value = DEFAULT_REFERENCE_SCALE
  aspectRatioLocked.value = true

  applyCanvasDimensions()
  applyReferenceScale()
}

const aspectRatio = computed(() => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(canvasWidth.value, canvasHeight.value)
  const ratioWidth = canvasWidth.value / divisor
  const ratioHeight = canvasHeight.value / divisor
  return `${ratioWidth}:${ratioHeight}`
})

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
