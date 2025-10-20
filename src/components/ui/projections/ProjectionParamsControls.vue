<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { getRelevantParameters, hasRelevantParameters } from '@/core/projections/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { useConfigStore } from '@/stores/config'
import { useParameterStore } from '@/stores/parameters'

const { t } = useI18n()
const configStore = useConfigStore()
const parameterStore = useParameterStore()

// Parameter ranges and steps
const RANGES = {
  rotateLongitude: { min: -180, max: 180, step: 1, default: 0 },
  rotateLatitude: { min: -90, max: 90, step: 1, default: 0 },
  centerLongitude: { min: -180, max: 180, step: 1, default: 0 },
  centerLatitude: { min: -90, max: 90, step: 1, default: 0 },
  parallel1: { min: 0, max: 90, step: 1, default: 30 },
  parallel2: { min: 0, max: 90, step: 1, default: 60 },
  scale: { min: 100, max: 5000, step: 50, default: 1000 },
}

// Get current projection definition
const currentProjection = computed(() => {
  if (!configStore.selectedProjection) {
    return undefined
  }
  return projectionRegistry.get(configStore.selectedProjection)
})

// Get effective parameters from parameter store (atlas params + global overrides)
const effectiveParams = computed(() => parameterStore.globalEffectiveParameters)

/**
 * Get the relevant parameters for the current projection
 * Uses centralized configuration from parameters.ts
 * Conditionally disables rotateLatitude based on lock state
 */
const relevantParams = computed(() => {
  const projection = currentProjection.value
  if (!projection) {
    return getRelevantParameters('OTHER')
  }

  const baseParams = getRelevantParameters(projection.family)

  // Override rotateLatitude based on lock state
  return {
    ...baseParams,
    rotateLatitude: baseParams.rotateLatitude && !configStore.rotateLatitudeLocked,
  }
})

// Get current values or defaults
const currentRotateLongitude = computed(() => {
  if (configStore.customRotateLongitude !== null) {
    return configStore.customRotateLongitude
  }
  const rotate = effectiveParams.value?.rotate
  if (Array.isArray(rotate)) {
    return rotate[0]
  }
  return RANGES.rotateLongitude.default
})

const currentRotateLatitude = computed(() => {
  if (configStore.customRotateLatitude !== null) {
    return configStore.customRotateLatitude
  }
  const rotate = effectiveParams.value?.rotate
  if (Array.isArray(rotate)) {
    return rotate[1]
  }
  return RANGES.rotateLatitude.default
})

const currentCenterLongitude = computed(() => {
  return configStore.customCenterLongitude
    ?? effectiveParams.value?.center?.[0]
    ?? RANGES.centerLongitude.default
})

const currentCenterLatitude = computed(() => {
  return configStore.customCenterLatitude
    ?? effectiveParams.value?.center?.[1]
    ?? RANGES.centerLatitude.default
})

const currentParallel1 = computed(() => {
  return configStore.customParallel1
    ?? effectiveParams.value?.parallels?.[0]
    ?? RANGES.parallel1.default
})

const currentParallel2 = computed(() => {
  return configStore.customParallel2
    ?? effectiveParams.value?.parallels?.[1]
    ?? RANGES.parallel2.default
})

// Check if any parameters differ from preset defaults
// This enables the reset button when user has customized parameters
const hasCustomParams = computed(() => {
  // If no preset loaded, check if any parameters are explicitly set
  if (!configStore.currentViewPreset) {
    return configStore.customRotateLongitude !== null
      || configStore.customRotateLatitude !== null
      || configStore.customCenterLongitude !== null
      || configStore.customCenterLatitude !== null
      || configStore.customParallel1 !== null
      || configStore.customParallel2 !== null
  }

  // Preset is loaded - check if current params differ from preset defaults
  // For now, any non-null custom parameter indicates divergence
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

/**
 * Check if the current projection supports latitude rotation (regardless of lock state)
 */
const supportsLatitudeRotation = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return false

  const baseParams = getRelevantParameters(projection.family)
  return baseParams.rotateLatitude
})
</script>

<template>
  <div>
    <!-- Uniform Projection Selector (for uniform projection mode) -->
    <ProjectionDropdown
      v-model="configStore.selectedProjection"
      :label="t('projection.cartographic')"
      :projection-groups="configStore.projectionGroups"
      :recommendations="configStore.projectionRecommendations"
    />
    <div
      v-if="hasAnyRelevantParams"
      class="flex flex-col gap-4 pt-6"
    >
      <button
        class="btn btn-sm btn-soft w-full gap-1 mb-4"
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
        size="xs"
        :min="RANGES.rotateLongitude.min"
        :max="RANGES.rotateLongitude.max"
        :step="RANGES.rotateLongitude.step"
        unit="°"
        @update:model-value="updateRotateLongitude"
      />

      <div class="flex flex-col gap-1">
        <!-- Latitude Lock Toggle (only show for projections that support latitude rotation) -->
        <ToggleControl
          v-if="supportsLatitudeRotation"
          :model-value="!configStore.rotateLatitudeLocked"
          :label="t(configStore.rotateLatitudeLocked ? 'projectionParams.unlockLatitude' : 'projectionParams.lockLatitude')"
          icon="ri-lock-unlock-line"
          @update:model-value="(value) => configStore.setRotateLatitudeLocked(!value)"
        />
        <!-- Rotate Latitude -->
        <RangeSlider
          v-if="relevantParams.rotateLatitude"
          :model-value="currentRotateLatitude"
          :label="t('projectionParams.rotateLatitude')"
          icon="ri-compass-4-line"
          size="xs"
          :min="RANGES.rotateLatitude.min"
          :max="RANGES.rotateLatitude.max"
          :step="RANGES.rotateLatitude.step"
          unit="°"
          @update:model-value="updateRotateLatitude"
        />
      </div>

      <!-- Center Longitude -->
      <RangeSlider
        v-if="relevantParams.centerLongitude"
        :model-value="currentCenterLongitude"
        :label="t('projectionParams.centerLongitude')"
        icon="ri-map-pin-line"
        size="xs"
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
  </div>
</template>
