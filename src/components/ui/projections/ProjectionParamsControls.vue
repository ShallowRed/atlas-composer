<script setup lang="ts">
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { parameterRegistry } from '@/core/parameters'
import { getDisplayedRotate, supportsPanning, updatePositioningAxis } from '@/core/positioning'
import { projectionRegistry } from '@/core/projections/registry'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const projectionStore = useProjectionStore()
const viewStore = useViewStore()
const parameterStore = useParameterStore()
const presetDefaults = usePresetDefaultsStore()

const currentProjection = computed(() => {
  if (!projectionStore.selectedProjection) {
    return undefined
  }
  return projectionRegistry.get(projectionStore.selectedProjection)
})

const projectionFamily = computed<ProjectionFamilyType>(() => {
  return currentProjection.value?.family ?? 'MISCELLANEOUS'
})

const effectiveParams = computed(() => parameterStore.globalEffectiveParameters)

const parallels = computed(() => effectiveParams.value.parallels ?? parameterRegistry.getDefaultValue('parallels'))

const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(projectionFamily.value)
})

const rotateRanges = computed(() => parameterStore.getTupleRanges(projectionFamily.value, 'rotate'))
const parallelsRanges = computed(() => parameterStore.getTupleRanges(projectionFamily.value, 'parallels'))
const scaleMultiplierRange = computed(() => parameterStore.getNumberRange(projectionFamily.value, 'scaleMultiplier'))

const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]: [string, any]) => constraint.relevant)
    .map(([key]) => key as keyof ProjectionParameters)
})

const hasRotateParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'rotate')
})

const hasParallelsParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'parallels')
})

const rotate = computed(() => getDisplayedRotate(effectiveParams.value, 'global'))

const supportsLatitudeRotation = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return false
  return supportsPanning(projection.family)
})

const hasAnyRelevantParams = computed(() => {
  return relevantParameters.value.length > 0 || true // Always show scale
})

const hasCustomParams = computed(() => {
  const globalParams = parameterStore.globalParameters
  const globalDefaults = presetDefaults.presetGlobalParameters

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

function handleRotateChange(axis: number, value: number) {
  parameterStore.setGlobalParameters(updatePositioningAxis(effectiveParams.value, 'global', 'rotate', axis, value))
}

function reset() {
  const currentParams = { ...parameterStore.globalParameters }
  parameterStore.setGlobalParameters({ rotate: undefined, center: undefined })
  for (const key of Object.keys(currentParams)) {
    if (key !== 'rotate' && key !== 'center')
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

      <template v-if="hasRotateParameter && rotateRanges">
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-base-content/70 flex items-center gap-1">
            <i class="ri-compass-3-line" />
            {{ t('territory.parameters.projectionSpecific') }}
          </h4>

          <RangeSlider
            :model-value="rotate[0]"
            :label="t('projectionParams.rotateLongitude')"
            icon="ri-map-pin-line"
            size="xs"
            :min="rotateRanges[0].min"
            :max="rotateRanges[0].max"
            :step="rotateRanges[0].step"
            unit="°"
            @update:model-value="(value: number) => handleRotateChange(0, value)"
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
              v-if="!projectionStore.rotateLatitudeLocked"
              :model-value="rotate[1]"
              :label="t('projectionParams.rotateLatitude')"
              icon="ri-map-pin-2-line"
              size="xs"
              :min="rotateRanges[1].min"
              :max="rotateRanges[1].max"
              :step="rotateRanges[1].step"
              unit="°"
              @update:model-value="(value: number) => handleRotateChange(1, value)"
            />
          </div>

          <RangeSlider
            :model-value="rotate[2]"
            :label="t('projectionParams.rotation')"
            icon="ri-rotate-lock-line"
            size="xs"
            :min="rotateRanges[2].min"
            :max="rotateRanges[2].max"
            :step="rotateRanges[2].step"
            unit="°"
            @update:model-value="(value: number) => handleRotateChange(2, value)"
          />
        </div>
      </template>

      <template v-if="hasParallelsParameter && parallelsRanges">
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-base-content/70 flex items-center gap-1">
            <i class="ri-subtract-line" />
            {{ t('projectionParams.parallels') }}
          </h4>

          <RangeSlider
            :model-value="parallels[0]"
            :label="t('projectionParams.parallel1')"
            icon="ri-subtract-line"
            size="xs"
            :min="parallelsRanges[0].min"
            :max="parallelsRanges[0].max"
            :step="parallelsRanges[0].step"
            unit="°"
            show-midpoint
            @update:model-value="(value: number) => {
              handleParameterChange('parallels', [value, parallels[1]])
            }"
          />

          <RangeSlider
            :model-value="parallels[1]"
            :label="t('projectionParams.parallel2')"
            icon="ri-subtract-line"
            size="xs"
            :min="parallelsRanges[1].min"
            :max="parallelsRanges[1].max"
            :step="parallelsRanges[1].step"
            unit="°"
            show-midpoint
            @update:model-value="(value: number) => {
              handleParameterChange('parallels', [parallels[0], value])
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
          v-if="!projectionStore.autoFitDomain && scaleMultiplierRange"
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
