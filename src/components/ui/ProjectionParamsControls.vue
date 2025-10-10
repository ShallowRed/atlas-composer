<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormControl from '@/components/ui/FormControl.vue'
import ProjectionSelector from '@/components/ui/ProjectionSelector.vue'
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
  configStore.setCustomRotate(value, currentRotateLatitude.value)
}

function updateRotateLatitude(value: number) {
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
/**
 * Check if there are any parameters to show for the current projection
 */
const hasAnyRelevantParams = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return false

  return hasRelevantParameters(projection.family)
})
</script>

<template>
  <div>
    <!-- Uniform Projection Selector (for uniform projection mode) -->
    <ProjectionSelector
      v-show="configStore.showProjectionSelector"
      v-model="configStore.selectedProjection"
      :label="t('projection.cartographic')"
      icon="ri-global-line"
      :projection-groups="configStore.projectionGroups"
      :recommendations="configStore.projectionRecommendations"
    />

    <!-- Scale Preservation (for split mode only) -->
    <FormControl
      v-show="configStore.showScalePreservation"
      v-model="configStore.scalePreservation"
      :label="t('territory.scalePreservation')"
      type="toggle"
    />
    <template
      v-if="hasAnyRelevantParams"
    >
      <div class="divider" />
      <!-- Header with reset button -->
      <h3 class="card-title">
        <i class="ri-equalizer-2-line" />
        {{ t('settings.projectionParamsTitle') }}
      </h3>
      <div
        class="flex flex-col gap-4 pt-6"
      >
        <button
          class="btn btn-sm btn-outline w-full gap-1 mb-4"
          :disabled="!hasCustomParams"
          @click="reset"
        >
          <i class="ri-refresh-line" />
          {{ t('projectionParams.reset') }}
        </button>

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
      </div>
    </template>
  </div>
</template>
