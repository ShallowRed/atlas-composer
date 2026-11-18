<script setup lang="ts">
import { DEFAULT_REFERENCE_SCALE } from '@atlas-composer/specification'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import NumberField from '@/components/ui/forms/NumberField.vue'
import ParameterInput from '@/components/ui/forms/ParameterInput.vue'
import { CANVAS_LENGTH_CONTROL, REFERENCE_SCALE_CONTROL, toDomain } from '@/core/parameters'
import { DEFAULT_CANVAS_DIMENSIONS } from '@/core/projections/defaults'
import { useCompositionStore } from '@/stores/composition'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'

const { t } = useI18n()
const projectionStore = useProjectionStore()
const compositionStore = useCompositionStore()
const presetDefaults = usePresetDefaultsStore()

const canvasWidth = ref(projectionStore.canvasDimensions?.width ?? DEFAULT_CANVAS_DIMENSIONS.width)
const canvasHeight = ref(projectionStore.canvasDimensions?.height ?? DEFAULT_CANVAS_DIMENSIONS.height)
const aspectRatioLocked = ref(true)

// The ratio that the lock keeps, so that a rounded side does not change it
const lockedRatio = ref(canvasWidth.value / canvasHeight.value)

const referenceScale = ref(projectionStore.referenceScale ?? DEFAULT_REFERENCE_SCALE)

watch(() => projectionStore.canvasDimensions, (newDimensions) => {
  if (newDimensions) {
    // A preset, an import or a reset gives the canvas a new ratio
    if (newDimensions.width !== canvasWidth.value || newDimensions.height !== canvasHeight.value) {
      lockedRatio.value = newDimensions.width / newDimensions.height
    }
    canvasWidth.value = newDimensions.width
    canvasHeight.value = newDimensions.height
  }
}, { immediate: true })

watch(() => projectionStore.referenceScale, (newScale) => {
  if (newScale !== undefined) {
    referenceScale.value = newScale
  }
}, { immediate: true })

// The side that the lock computes stays inside the domain of a length of the canvas
function lockedLength(value: number): number {
  return toDomain(value, CANVAS_LENGTH_CONTROL.domain, CANVAS_LENGTH_CONTROL.format)
}

function updateCanvasWidth(value: number) {
  canvasWidth.value = value

  if (aspectRatioLocked.value) {
    canvasHeight.value = lockedLength(value / lockedRatio.value)
  }

  applyCanvasDimensions()
}

function updateCanvasHeight(value: number) {
  canvasHeight.value = value

  if (aspectRatioLocked.value) {
    canvasWidth.value = lockedLength(value * lockedRatio.value)
  }

  applyCanvasDimensions()
}

function toggleAspectRatioLock() {
  aspectRatioLocked.value = !aspectRatioLocked.value
  if (aspectRatioLocked.value) {
    lockedRatio.value = canvasWidth.value / canvasHeight.value
  }
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
  aspectRatioLocked.value = true
  compositionStore.resetCanvas()
  // The reset canvas may equal the shown one, which the watch then leaves alone
  const { width, height } = projectionStore.canvasDimensions ?? DEFAULT_CANVAS_DIMENSIONS
  lockedRatio.value = width / height
}

const hasCustomValues = computed(() => presetDefaults.canvasDiffersFromPreset({
  referenceScale: referenceScale.value,
  dimensions: { width: canvasWidth.value, height: canvasHeight.value },
}))
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

    <div class="space-y-1">
      <span class="text-xs font-medium text-base-content/70">{{ t('projectionControls.global.canvasDimensions') }}</span>
      <div class="flex items-center gap-1">
        <NumberField
          :model-value="canvasWidth"
          :label="t('projectionControls.global.canvasWidth')"
          prefix="L"
          scrub
          :control="CANVAS_LENGTH_CONTROL"
          @update:model-value="updateCanvasWidth"
        />
        <button
          type="button"
          class="btn btn-ghost btn-square btn-sm flex-none"
          :class="{ 'text-primary': aspectRatioLocked }"
          :aria-pressed="aspectRatioLocked"
          :aria-label="t('projectionControls.global.lockAspectRatio')"
          :title="t('projectionControls.global.lockAspectRatio')"
          @click="toggleAspectRatioLock"
        >
          <i :class="aspectRatioLocked ? 'ri-link' : 'ri-link-unlink'" />
        </button>
        <NumberField
          :model-value="canvasHeight"
          :label="t('projectionControls.global.canvasHeight')"
          prefix="H"
          scrub
          :control="CANVAS_LENGTH_CONTROL"
          @update:model-value="updateCanvasHeight"
        />
      </div>
    </div>

    <ParameterInput
      :model-value="referenceScale"
      :label="t('projectionControls.global.referenceScale')"
      :control="REFERENCE_SCALE_CONTROL"
      @update:model-value="updateReferenceScale"
    />
  </div>
</template>
