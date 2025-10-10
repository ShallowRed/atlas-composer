<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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

// Update functions
function updateRotateLongitude(event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  console.log('[ProjectionParamsControls] updateRotateLongitude:', value)
  configStore.setCustomRotate(value, currentRotateLatitude.value)
}

function updateRotateLatitude(event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  console.log('[ProjectionParamsControls] updateRotateLatitude:', value)
  configStore.setCustomRotate(currentRotateLongitude.value, value)
}

function updateCenterLongitude(event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  configStore.setCustomCenter(value, currentCenterLatitude.value)
}

function updateCenterLatitude(event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  configStore.setCustomCenter(currentCenterLongitude.value, value)
}

function updateParallel1(event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  configStore.setCustomParallels(value, currentParallel2.value)
}

function updateParallel2(event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  configStore.setCustomParallels(currentParallel1.value, value)
}

function reset() {
  configStore.resetProjectionParams()
}
</script>

<template>
  <div class="space-y-4">
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
    <div>
      <label class="label">
        <span class="label-text text-xs">
          <i class="ri-compass-3-line" />
          {{ t('projectionParams.rotateLongitude') }}: {{ Math.round(currentRotateLongitude) }}°
        </span>
      </label>
      <input
        type="range"
        :min="RANGES.rotateLongitude.min"
        :max="RANGES.rotateLongitude.max"
        :step="RANGES.rotateLongitude.step"
        :value="currentRotateLongitude"
        class="range range-primary range-xs"
        @input="updateRotateLongitude"
      >
      <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
        <span>{{ RANGES.rotateLongitude.min }}°</span>
        <span>0°</span>
        <span>{{ RANGES.rotateLongitude.max }}°</span>
      </div>
    </div>

    <!-- Rotate Latitude -->
    <div>
      <label class="label">
        <span class="label-text text-xs">
          <i class="ri-compass-4-line" />
          {{ t('projectionParams.rotateLatitude') }}: {{ Math.round(currentRotateLatitude) }}°
        </span>
      </label>
      <input
        type="range"
        :min="RANGES.rotateLatitude.min"
        :max="RANGES.rotateLatitude.max"
        :step="RANGES.rotateLatitude.step"
        :value="currentRotateLatitude"
        class="range range-primary range-xs"
        @input="updateRotateLatitude"
      >
      <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
        <span>{{ RANGES.rotateLatitude.min }}°</span>
        <span>0°</span>
        <span>{{ RANGES.rotateLatitude.max }}°</span>
      </div>
    </div>

    <!-- Center Longitude -->
    <div>
      <label class="label">
        <span class="label-text text-xs">
          <i class="ri-map-pin-line" />
          {{ t('projectionParams.centerLongitude') }}: {{ Math.round(currentCenterLongitude) }}°
        </span>
      </label>
      <input
        type="range"
        :min="RANGES.centerLongitude.min"
        :max="RANGES.centerLongitude.max"
        :step="RANGES.centerLongitude.step"
        :value="currentCenterLongitude"
        class="range range-primary range-xs"
        @input="updateCenterLongitude"
      >
      <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
        <span>{{ RANGES.centerLongitude.min }}°</span>
        <span>0°</span>
        <span>{{ RANGES.centerLongitude.max }}°</span>
      </div>
    </div>

    <!-- Center Latitude -->
    <div>
      <label class="label">
        <span class="label-text text-xs">
          <i class="ri-map-pin-2-line" />
          {{ t('projectionParams.centerLatitude') }}: {{ Math.round(currentCenterLatitude) }}°
        </span>
      </label>
      <input
        type="range"
        :min="RANGES.centerLatitude.min"
        :max="RANGES.centerLatitude.max"
        :step="RANGES.centerLatitude.step"
        :value="currentCenterLatitude"
        class="range range-primary range-xs"
        @input="updateCenterLatitude"
      >
      <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
        <span>{{ RANGES.centerLatitude.min }}°</span>
        <span>0°</span>
        <span>{{ RANGES.centerLatitude.max }}°</span>
      </div>
    </div>

    <!-- Parallel 1 (for conic projections) -->
    <div>
      <label class="label">
        <span class="label-text text-xs">
          <i class="ri-subtract-line" />
          {{ t('projectionParams.parallel1') }}: {{ Math.round(currentParallel1) }}°
        </span>
      </label>
      <input
        type="range"
        :min="RANGES.parallel1.min"
        :max="RANGES.parallel1.max"
        :step="RANGES.parallel1.step"
        :value="currentParallel1"
        class="range range-primary range-xs"
        @input="updateParallel1"
      >
      <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
        <span>{{ RANGES.parallel1.min }}°</span>
        <span>{{ Math.round((RANGES.parallel1.max - RANGES.parallel1.min) / 2) }}°</span>
        <span>{{ RANGES.parallel1.max }}°</span>
      </div>
    </div>

    <!-- Parallel 2 (for conic projections) -->
    <div>
      <label class="label">
        <span class="label-text text-xs">
          <i class="ri-subtract-line" />
          {{ t('projectionParams.parallel2') }}: {{ Math.round(currentParallel2) }}°
        </span>
      </label>
      <input
        type="range"
        :min="RANGES.parallel2.min"
        :max="RANGES.parallel2.max"
        :step="RANGES.parallel2.step"
        :value="currentParallel2"
        class="range range-primary range-xs"
        @input="updateParallel2"
      >
      <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
        <span>{{ RANGES.parallel2.min }}°</span>
        <span>{{ Math.round((RANGES.parallel2.max - RANGES.parallel2.min) / 2) }}°</span>
        <span>{{ RANGES.parallel2.max }}°</span>
      </div>
    </div>

    <!-- Info note -->
    <div class="alert alert-info text-xs">
      <i class="ri-information-line" />
      <span>{{ t('projectionParams.info') }}</span>
    </div>
  </div>
</template>
