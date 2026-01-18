<script setup lang="ts">
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { getRelevantParameters } from '@/core/projections/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const projectionStore = useProjectionStore()
const viewStore = useViewStore()
const parameterStore = useParameterStore()
const presetDefaults = getSharedPresetDefaults()

const currentProjection = computed(() => {
  if (!projectionStore.selectedProjection) {
    return undefined
  }
  return projectionRegistry.get(projectionStore.selectedProjection)
})

const projectionFamily = computed<ProjectionFamilyType>(() => {
  return currentProjection.value?.family ?? 'OTHER'
})

const effectiveParams = computed(() => parameterStore.globalEffectiveParameters)

const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(projectionFamily.value)
})

function getParameterRange(paramKey: keyof ProjectionParameters) {
  const constraints = parameterConstraints.value.constraints[paramKey]
  if (!constraints) {
    const fallbackRanges: Record<string, { min: number, max: number, step: number }> = {
      focusLongitude: { min: -180, max: 180, step: 1 },
      focusLatitude: { min: -90, max: 90, step: 1 },
      rotateGamma: { min: -180, max: 180, step: 1 },
      parallel1: { min: -90, max: 90, step: 1 },
      parallel2: { min: -90, max: 90, step: 1 },
      scaleMultiplier: { min: 0.1, max: 10, step: 0.1 },
    }
    return fallbackRanges[paramKey as string] || { min: 0, max: 100, step: 1 }
  }

  return {
    min: constraints.min ?? 0,
    max: constraints.max ?? 100,
    step: constraints.step ?? 1,
  }
}

const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]: [string, any]) => constraint.relevant)
    .map(([key]) => key as keyof ProjectionParameters)
})

const focusLongitudeRange = computed(() => getParameterRange('focusLongitude'))
const focusLatitudeRange = computed(() => getParameterRange('focusLatitude'))
const rotateGammaRange = computed(() => getParameterRange('rotateGamma'))
const parallel1Range = computed(() => getParameterRange('parallel1'))
const parallel2Range = computed(() => getParameterRange('parallel2'))
const scaleMultiplierRange = computed(() => getParameterRange('scaleMultiplier'))

const hasFocusLongitudeParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'focusLongitude')
})

const hasFocusLatitudeParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'focusLatitude')
})

const hasRotateGammaParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'rotateGamma')
})

const hasParallelsParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'parallels')
})

const supportsLatitudeRotation = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return false
  const baseParams = getRelevantParameters(projection.family)
  return baseParams.rotateLatitude
})

const hasAnyRelevantParams = computed(() => {
  return relevantParameters.value.length > 0 || true // Always show scale
})

const hasCustomParams = computed(() => {
  const globalParams = parameterStore.globalParameters
  const globalDefaults = presetDefaults.presetGlobalParameters.value

  if (Object.keys(globalParams).length === 0) {
    return false
  }

  if (!globalDefaults) {
    return true
  }

  for (const [key, value] of Object.entries(globalParams)) {
    const defaultValue = globalDefaults[key as keyof ProjectionParameters]
    if (Array.isArray(value) && Array.isArray(defaultValue)) {
      if (value.length !== defaultValue.length || value.some((v, i) => v !== defaultValue[i])) {
        return true
      }
    }
    else if (value !== defaultValue) {
      return true
    }
  }

  return false
})

function handleParameterChange(key: keyof ProjectionParameters, value: unknown) {
  parameterStore.setGlobalParameter(key, value)
}

function reset() {
  const currentParams = { ...parameterStore.globalParameters }
  for (const key of Object.keys(currentParams)) {
    parameterStore.setGlobalParameter(key as keyof ProjectionParameters, undefined)
  }
}
</script>

<template>
  <div>
    <ProjectionDropdown
      v-model="projectionStore.selectedProjection"
      :label="t('projection.cartographic')"
      :projection-groups="viewStore.projectionGroups"
      :recommendations="viewStore.projectionRecommendations"
    />

    <div
      v-if="hasAnyRelevantParams"
      class="flex flex-col gap-4 pt-6"
    >
      <button
        class="btn btn-sm btn-soft w-full gap-1 mb-2"
        :disabled="!hasCustomParams"
        @click="reset"
      >
        <i class="ri-refresh-line" />
        {{ t('projectionParams.reset') }}
      </button>

      <template v-if="hasFocusLongitudeParameter || hasFocusLatitudeParameter || hasRotateGammaParameter">
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-base-content/70 flex items-center gap-1">
            <i class="ri-compass-3-line" />
            {{ t('territory.parameters.projectionSpecific') }}
          </h4>

          <RangeSlider
            v-if="hasFocusLongitudeParameter"
            :model-value="effectiveParams.focusLongitude ?? 0"
            :label="t('projectionParams.focusLongitude')"
            icon="ri-map-pin-line"
            size="xs"
            :min="focusLongitudeRange.min"
            :max="focusLongitudeRange.max"
            :step="focusLongitudeRange.step"
            unit="°"
            @update:model-value="(value: number) => handleParameterChange('focusLongitude', value)"
          />

          <div
            v-if="supportsLatitudeRotation"
            class="flex flex-col gap-1"
          >
            <ToggleControl
              :model-value="!projectionStore.rotateLatitudeLocked"
              :label="t(projectionStore.rotateLatitudeLocked ? 'projectionParams.unlockLatitude' : 'projectionParams.lockLatitude')"
              icon="ri-lock-unlock-line"
              @update:model-value="(value: boolean) => projectionStore.setRotateLatitudeLocked(!value)"
            />

            <RangeSlider
              v-if="hasFocusLatitudeParameter && !projectionStore.rotateLatitudeLocked"
              :model-value="effectiveParams.focusLatitude ?? 0"
              :label="t('projectionParams.focusLatitude')"
              icon="ri-map-pin-2-line"
              size="xs"
              :min="focusLatitudeRange.min"
              :max="focusLatitudeRange.max"
              :step="focusLatitudeRange.step"
              unit="°"
              @update:model-value="(value: number) => handleParameterChange('focusLatitude', value)"
            />
          </div>

          <RangeSlider
            v-if="hasRotateGammaParameter"
            :model-value="effectiveParams.rotateGamma ?? 0"
            :label="t('projectionParams.rotateGamma')"
            icon="ri-rotate-lock-line"
            size="xs"
            :min="rotateGammaRange.min"
            :max="rotateGammaRange.max"
            :step="rotateGammaRange.step"
            unit="°"
            @update:model-value="(value: number) => handleParameterChange('rotateGamma', value)"
          />
        </div>
      </template>

      <template v-if="hasParallelsParameter">
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-base-content/70 flex items-center gap-1">
            <i class="ri-subtract-line" />
            {{ t('projectionParams.parallels') }}
          </h4>

          <RangeSlider
            :model-value="effectiveParams.parallels?.[0] ?? 30"
            :label="t('projectionParams.parallel1')"
            icon="ri-subtract-line"
            size="xs"
            :min="parallel1Range.min"
            :max="parallel1Range.max"
            :step="parallel1Range.step"
            unit="°"
            show-midpoint
            @update:model-value="(value: number) => {
              const currentParallels = effectiveParams.parallels ?? [30, 60]
              handleParameterChange('parallels', [value, currentParallels[1]])
            }"
          />

          <RangeSlider
            :model-value="effectiveParams.parallels?.[1] ?? 60"
            :label="t('projectionParams.parallel2')"
            icon="ri-subtract-line"
            size="xs"
            :min="parallel2Range.min"
            :max="parallel2Range.max"
            :step="parallel2Range.step"
            unit="°"
            show-midpoint
            @update:model-value="(value: number) => {
              const currentParallels = effectiveParams.parallels ?? [30, 60]
              handleParameterChange('parallels', [currentParallels[0], value])
            }"
          />
        </div>
      </template>

      <div class="space-y-2">
        <h4 class="text-xs font-medium text-base-content/70 flex items-center gap-1">
          <i class="ri-zoom-in-line" />
          {{ t('territory.parameters.layout') }}
        </h4>

        <ToggleControl
          :model-value="!projectionStore.autoFitDomain"
          :label="t(projectionStore.autoFitDomain ? 'projectionParams.enableCustomScale' : 'projectionParams.disableCustomScale')"
          icon="ri-aspect-ratio-line"
          @update:model-value="(value: boolean) => projectionStore.setAutoFitDomain(!value)"
        />

        <RangeSlider
          v-if="!projectionStore.autoFitDomain"
          :model-value="effectiveParams.scaleMultiplier ?? 1.0"
          :label="t('projectionParams.scaleMultiplier')"
          icon="ri-zoom-in-line"
          size="xs"
          :min="scaleMultiplierRange.min"
          :max="scaleMultiplierRange.max"
          :step="scaleMultiplierRange.step"
          unit="×"
          @update:model-value="(value: number) => handleParameterChange('scaleMultiplier', value)"
        />
      </div>
    </div>
  </div>
</template>
