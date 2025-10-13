<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import { getRelevantParameters } from '@/core/projections/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { useTerritoryStore } from '@/stores/territory'

const props = defineProps<{
  territoryCode: string
  projectionId?: string
}>()

const { t } = useI18n()
const territoryStore = useTerritoryStore()

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
  if (!props.projectionId)
    return undefined
  return projectionRegistry.get(props.projectionId)
})

// Get the relevant parameters for the current projection
const relevantParams = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return getRelevantParameters('OTHER')

  return getRelevantParameters(projection.family)
})

// Get current territory params
const territoryParams = computed(() => {
  return territoryStore.territoryProjectionParams[props.territoryCode] || {}
})

// Get current values or defaults
const currentRotateLongitude = computed(() => {
  return territoryParams.value.rotateLongitude ?? RANGES.rotateLongitude.default
})

const currentRotateLatitude = computed(() => {
  return territoryParams.value.rotateLatitude ?? RANGES.rotateLatitude.default
})

const currentCenterLongitude = computed(() => {
  return territoryParams.value.centerLongitude ?? RANGES.centerLongitude.default
})

const currentCenterLatitude = computed(() => {
  return territoryParams.value.centerLatitude ?? RANGES.centerLatitude.default
})

const currentParallel1 = computed(() => {
  return territoryParams.value.parallel1 ?? RANGES.parallel1.default
})

const currentParallel2 = computed(() => {
  return territoryParams.value.parallel2 ?? RANGES.parallel2.default
})

// Check if any custom parameters are set for this territory
const hasCustomParams = computed(() => {
  const params = territoryParams.value
  return Object.keys(params).length > 0
})

// Check if there are any parameters to show for the current projection
const hasAnyRelevantParams = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return false

  return Object.values(relevantParams.value).some(v => v)
})

// Update functions
function updateRotateLongitude(value: number) {
  territoryStore.setTerritoryProjectionParam(props.territoryCode, 'rotateLongitude', value)
}

function updateRotateLatitude(value: number) {
  territoryStore.setTerritoryProjectionParam(props.territoryCode, 'rotateLatitude', value)
}

function updateCenterLongitude(value: number) {
  territoryStore.setTerritoryProjectionParam(props.territoryCode, 'centerLongitude', value)
}

function updateCenterLatitude(value: number) {
  territoryStore.setTerritoryProjectionParam(props.territoryCode, 'centerLatitude', value)
}

function updateParallel1(value: number) {
  territoryStore.setTerritoryProjectionParam(props.territoryCode, 'parallel1', value)
}

function updateParallel2(value: number) {
  territoryStore.setTerritoryProjectionParam(props.territoryCode, 'parallel2', value)
}

function reset() {
  territoryStore.resetTerritoryProjectionParams(props.territoryCode)
}
</script>

<template>
  <div v-if="hasAnyRelevantParams">
    <div class="divider my-2" />
    <!-- Header with reset button -->
    <h4 class="text-sm font-semibold flex items-center gap-2 mb-2">
      <i class="ri-equalizer-2-line" />
      {{ t('territoryParams.title') }}
    </h4>
    <p class="text-xs opacity-70 mb-3">
      {{ t('territoryParams.info') }}
    </p>
    <div class="flex flex-col gap-3">
      <button
        class="btn btn-xs btn-soft w-full gap-1"
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
        size="xs"
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
        size="xs"
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
        size="xs"
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
