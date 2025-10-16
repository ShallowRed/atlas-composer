<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { useProjectionConfig } from '@/composables/useProjectionConfig'
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
  scale: { min: 100, max: 5000, step: 50, default: 1000 },
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

// Get current values or defaults from atlas
const currentRotateLongitude = computed(() => {
  if (configStore.customRotateLongitude !== null) {
    return configStore.customRotateLongitude
  }
  const rotate = configStore.effectiveProjectionParams?.rotate
  if (Array.isArray(rotate)) {
    return rotate[0]
  }
  return RANGES.rotateLongitude.default
})

const currentRotateLatitude = computed(() => {
  if (configStore.customRotateLatitude !== null) {
    return configStore.customRotateLatitude
  }
  const rotate = configStore.effectiveProjectionParams?.rotate
  if (Array.isArray(rotate)) {
    return rotate[1]
  }
  return RANGES.rotateLatitude.default
})

const currentCenterLongitude = computed(() => {
  return configStore.customCenterLongitude
    ?? configStore.effectiveProjectionParams?.center?.[0]
    ?? RANGES.centerLongitude.default
})

const currentCenterLatitude = computed(() => {
  return configStore.customCenterLatitude
    ?? configStore.effectiveProjectionParams?.center?.[1]
    ?? RANGES.centerLatitude.default
})

const currentParallel1 = computed(() => {
  return configStore.customParallel1
    ?? configStore.effectiveProjectionParams?.parallels?.[0]
    ?? RANGES.parallel1.default
})

const currentParallel2 = computed(() => {
  return configStore.customParallel2
    ?? configStore.effectiveProjectionParams?.parallels?.[1]
    ?? RANGES.parallel2.default
})

const currentScale = computed(() => {
  return configStore.customScale ?? RANGES.scale.default
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

function updateScale(value: number) {
  configStore.setCustomScale(value)
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
const { compositeProjectionOptions } = useProjectionConfig()
</script>

<template>
  <div>
    <!-- Composite Projection Selector (for composite-existing mode) -->
    <DropdownControl
      v-if="configStore.viewMode === 'composite-existing'"
      v-model="configStore.compositeProjection"
      :label="t('projection.composite')"
      icon="ri-global-line"
      :options="compositeProjectionOptions"
    />
    <template v-else>
      <!-- Uniform Projection Selector (for uniform projection mode) -->
      <ProjectionDropdown
        v-show="configStore.showProjectionSelector"
        v-model="configStore.selectedProjection"
        :label="t('projection.cartographic')"
        :projection-groups="configStore.projectionGroups"
        :recommendations="configStore.projectionRecommendations"
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
          <!-- Fitting Mode Toggle -->
          <ToggleControl
            :model-value="configStore.projectionFittingMode === 'manual'"
            label="Manual Control"
            icon="ri-settings-3-line"
            @update:model-value="(value) => configStore.setProjectionFittingMode(value ? 'manual' : 'auto')"
          />

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

          <!-- Scale (manual mode only) -->
          <RangeSlider
            v-if="configStore.projectionFittingMode === 'manual'"
            :model-value="currentScale"
            label="Scale"
            icon="ri-zoom-in-line"
            size="xs"
            :min="RANGES.scale.min"
            :max="RANGES.scale.max"
            :step="RANGES.scale.step"
            @update:model-value="updateScale"
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
    </template>
  </div>
</template>
