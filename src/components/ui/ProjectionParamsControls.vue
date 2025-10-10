<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Alert from '@/components/ui/Alert.vue'
import RangeSlider from '@/components/ui/RangeSlider.vue'
import { getRelevantParameters, hasRelevantParameters } from '@/core/projections/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { useConfigStore } from '@/stores/config'

const { t } = useI18n()
const configStore = useConfigStore()

// Parameter ranges and steps
const RANGES = {
  rotateLongitude: { min: -180, max: 180, step: 1, default: 0 },
  rotateLatitude: { min: -90, max: 90, step: 1, default: 0 },
  centerLongitude: { min: -180, max: 180, step: 1, default: 0 },
  centerLatitude: { min: -90, max: 90, step: 1, default: 0 },
  parallel1: { min: 0, max: 90, step: 1, default: 30 },
  parallel2: { min: 0, max: 90, step: 1, default: 60 },
}

// Get current projection definition
const currentProjection = computed(() => {
  if (!configStore.selectedProjection) {
    return undefined
  }
  return projectionRegistry.get(configStore.selectedProjection)
})

/**
 * Get the relevant parameters for the current projection
 * Uses centralized configuration from parameters.ts
 */
const relevantParams = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return getRelevantParameters('OTHER')

  return getRelevantParameters(projection.family)
})

/**
 * Check if there are any parameters to show for the current projection
 */
const hasAnyRelevantParams = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return false

  return hasRelevantParameters(projection.family)
})

// Get current values or defaults from atlas
const currentRotateLongitude = computed(() => {
  if (configStore.customRotateLongitude !== null) {
    return configStore.customRotateLongitude
  }
  const rotate = configStore.effectiveProjectionParams?.rotate?.mainland
  if (typeof rotate === 'number') {
    return rotate
  }
  if (Array.isArray(rotate)) {
    return rotate[0]
  }
  return RANGES.rotateLongitude.default
})

const currentRotateLatitude = computed(() => {
  if (configStore.customRotateLatitude !== null) {
    return configStore.customRotateLatitude
  }
  const rotate = configStore.effectiveProjectionParams?.rotate?.azimuthal
  if (typeof rotate === 'number') {
    return rotate
  }
  if (Array.isArray(rotate)) {
    return rotate[1]
  }
  return RANGES.rotateLatitude.default
})

const currentCenterLongitude = computed(() => {
  return configStore.customCenterLongitude
    ?? configStore.effectiveProjectionParams?.center?.longitude
    ?? RANGES.centerLongitude.default
})

const currentCenterLatitude = computed(() => {
  return configStore.customCenterLatitude
    ?? configStore.effectiveProjectionParams?.center?.latitude
    ?? RANGES.centerLatitude.default
})

const currentParallel1 = computed(() => {
  return configStore.customParallel1
    ?? configStore.effectiveProjectionParams?.parallels?.conic?.[0]
    ?? RANGES.parallel1.default
})

const currentParallel2 = computed(() => {
  return configStore.customParallel2
    ?? configStore.effectiveProjectionParams?.parallels?.conic?.[1]
    ?? RANGES.parallel2.default
})

// Check if any custom parameters are set
const hasCustomParams = computed(() => {
  return configStore.customRotateLongitude !== null
    || configStore.customRotateLatitude !== null
    || configStore.customCenterLongitude !== null
    || configStore.customCenterLatitude !== null
    || configStore.customParallel1 !== null
    || configStore.customParallel2 !== null
})

// Update functions for projection parameters
function updateRotateLongitude(value: number) {
  console.log('[ProjectionParamsControls] updateRotateLongitude:', value)
  configStore.setCustomRotate(value, currentRotateLatitude.value)
}

function updateRotateLatitude(value: number) {
  console.log('[ProjectionParamsControls] updateRotateLatitude:', value)
  configStore.setCustomRotate(currentRotateLongitude.value, value)
}

function updateCenterLongitude(value: number) {
  configStore.setCustomCenter(value, currentCenterLatitude.value)
}

function updateCenterLatitude(value: number) {
  configStore.setCustomCenter(currentCenterLongitude.value, value)
}

function updateParallel1(value: number) {
  configStore.setCustomParallels(value, currentParallel2.value)
}

function updateParallel2(value: number) {
  configStore.setCustomParallels(currentParallel1.value, value)
}

function reset() {
  configStore.resetProjectionParams()
}
</script>

<template>
  <div v-if="hasAnyRelevantParams" class="space-y-4">
    <!-- Header with reset button -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold flex items-center gap-2">
        <i class="ri-global-line" />
        {{ t('projectionParams.title') }}
      </h3>
      <button
        v-if="hasCustomParams"
        class="btn btn-xs btn-ghost gap-1"
        @click="reset"
      >
        <i class="ri-refresh-line" />
        {{ t('projectionParams.reset') }}
      </button>
    </div>

    <!-- Rotate Longitude -->
    <RangeSlider
      v-if="relevantParams.rotateLongitude"
      :model-value="currentRotateLongitude"
      :label="t('projectionParams.rotateLongitude')"
      icon="ri-compass-3-line"
      :min="RANGES.rotateLongitude.min"
      :max="RANGES.rotateLongitude.max"
      :step="RANGES.rotateLongitude.step"
      unit="°"
      @update:model-value="updateRotateLongitude"
    />

    <!-- Rotate Latitude -->
    <RangeSlider
      v-if="relevantParams.rotateLatitude"
      :model-value="currentRotateLatitude"
      :label="t('projectionParams.rotateLatitude')"
      icon="ri-compass-4-line"
      :min="RANGES.rotateLatitude.min"
      :max="RANGES.rotateLatitude.max"
      :step="RANGES.rotateLatitude.step"
      unit="°"
      @update:model-value="updateRotateLatitude"
    />

    <!-- Center Longitude -->
    <RangeSlider
      v-if="relevantParams.centerLongitude"
      :model-value="currentCenterLongitude"
      :label="t('projectionParams.centerLongitude')"
      icon="ri-map-pin-line"
      :min="RANGES.centerLongitude.min"
      :max="RANGES.centerLongitude.max"
      :step="RANGES.centerLongitude.step"
      unit="°"
      @update:model-value="updateCenterLongitude"
    />

    <!-- Center Latitude -->
    <RangeSlider
      v-if="relevantParams.centerLatitude"
      :model-value="currentCenterLatitude"
      :label="t('projectionParams.centerLatitude')"
      icon="ri-map-pin-2-line"
      :min="RANGES.centerLatitude.min"
      :max="RANGES.centerLatitude.max"
      :step="RANGES.centerLatitude.step"
      unit="°"
      @update:model-value="updateCenterLatitude"
    />

    <!-- Parallel 1 (for conic projections) -->
    <RangeSlider
      v-if="relevantParams.parallels"
      :model-value="currentParallel1"
      :label="t('projectionParams.parallel1')"
      icon="ri-subtract-line"
      :min="RANGES.parallel1.min"
      :max="RANGES.parallel1.max"
      :step="RANGES.parallel1.step"
      unit="°"
      show-midpoint
      @update:model-value="updateParallel1"
    />

    <!-- Parallel 2 (for conic projections) -->
    <RangeSlider
      v-if="relevantParams.parallels"
      :model-value="currentParallel2"
      :label="t('projectionParams.parallel2')"
      icon="ri-subtract-line"
      :min="RANGES.parallel2.min"
      :max="RANGES.parallel2.max"
      :step="RANGES.parallel2.step"
      unit="°"
      show-midpoint
      @update:model-value="updateParallel2"
    />

    <!-- Info note -->
    <Alert type="info" size="xs">
      {{ t('projectionParams.info') }}
    </Alert>
  </div>

  <!-- No parameters available message -->
  <Alert v-else type="warning" size="xs">
    {{ t('projectionParams.noParams') }}
  </Alert>
</template>
