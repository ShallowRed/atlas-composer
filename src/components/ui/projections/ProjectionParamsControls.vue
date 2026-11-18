<script setup lang="ts">
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LatitudeBandSlider from '@/components/ui/forms/LatitudeBandSlider.vue'
import NumberField from '@/components/ui/forms/NumberField.vue'
import ParameterInput from '@/components/ui/forms/ParameterInput.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { orderedPairLimits, parallelsForBand, parameterRegistry } from '@/core/parameters'
import { getDisplayedRotate, supportsPanning, updatePositioningAxis } from '@/core/positioning'
import { projectionRegistry } from '@/core/projections/registry'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
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

const atlasStore = useAtlasStore()
const geoDataStore = useGeoDataStore()

const rotateControls = computed(() => parameterStore.getAxisControls(projectionFamily.value, 'rotate'))
const parallelsControls = computed(() => parameterStore.getAxisControls(projectionFamily.value, 'parallels'))
const scaleMultiplierControl = computed(() => parameterStore.getAxisControls(projectionFamily.value, 'scaleMultiplier')?.[0])

// The band of the territories that the view shows
const band = computed(() => atlasStore.displayedLatitudeBand(geoDataStore.filteredTerritories.map(territory => territory.code)))

const parallelsLimits = computed(() => parallelsControls.value
  ? orderedPairLimits(parallels.value, parallelsControls.value[0]!.format)
  : undefined)

function updateParallel(index: number, value: number) {
  const updated = [...parallels.value] as [number, number]
  updated[index] = value
  handleParameterChange('parallels', updated)
}

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

const hasCustomParams = computed(() => presetDefaults.globalDiffersFromPreset(effectiveParams.value))

function handleParameterChange(key: keyof ProjectionParameters, value: unknown) {
  parameterStore.setGlobalParameter(key, value)
}

function handleRotateChange(axis: number, value: number) {
  parameterStore.setGlobalParameters(updatePositioningAxis(effectiveParams.value, 'global', 'rotate', axis, value))
}

function reset() {
  parameterStore.clearGlobalParameters()
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

    <div class="flex flex-col gap-4 pt-6">
      <button
        class="btn btn-sm btn-soft w-full gap-1 mb-2"
        :disabled="!hasCustomParams"
        @click="reset"
      >
        <i class="ri-refresh-line" />
        {{ t('projectionParams.reset') }}
      </button>

      <div
        v-if="hasRotateParameter && rotateControls"
        class="space-y-3"
      >
        <ParameterInput
          :model-value="rotate[0]"
          :label="t('projectionParams.rotateLongitude')"
          :control="rotateControls[0]!"
          @update:model-value="(value: number) => handleRotateChange(0, value)"
        />

        <ToggleControl
          v-if="supportsLatitudeRotation"
          :model-value="!projectionStore.rotateLatitudeLocked"
          :label="t(projectionStore.rotateLatitudeLocked ? 'projectionParams.unlockLatitude' : 'projectionParams.lockLatitude')"
          icon="ri-lock-unlock-line"
          @update:model-value="(value: boolean) => projectionStore.setRotateLatitudeLocked(!value)"
        />

        <ParameterInput
          v-if="supportsLatitudeRotation && !projectionStore.rotateLatitudeLocked"
          :model-value="rotate[1]"
          :label="t('projectionParams.rotateLatitude')"
          :control="rotateControls[1]!"
          @update:model-value="(value: number) => handleRotateChange(1, value)"
        />

        <ParameterInput
          :model-value="rotate[2]"
          :label="t('projectionParams.rotation')"
          :control="rotateControls[2]!"
          @update:model-value="(value: number) => handleRotateChange(2, value)"
        />
      </div>

      <div
        v-if="hasParallelsParameter && parallelsControls && parallelsLimits"
        class="space-y-1"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-base-content/70">{{ t('projectionParams.parallels') }}</span>
          <button
            v-if="band"
            type="button"
            class="btn btn-ghost btn-xs"
            @click="handleParameterChange('parallels', parallelsForBand(band))"
          >
            {{ t('projectionParams.parallelsRule') }}
          </button>
        </div>
        <LatitudeBandSlider
          v-if="band"
          :model-value="parallels"
          :band="band"
          :control="parallelsControls[0]!"
          @update:model-value="(value: [number, number]) => handleParameterChange('parallels', value)"
        />
        <div class="grid grid-cols-2 gap-2">
          <NumberField
            v-for="index in [0, 1]"
            :key="index"
            :model-value="parallels[index]!"
            :label="index === 0 ? t('projectionParams.parallel1') : t('projectionParams.parallel2')"
            :prefix="index === 0 ? 'φ₁' : 'φ₂'"
            scrub
            :control="parallelsControls[index]!"
            :limits="parallelsLimits[index]"
            @update:model-value="(value: number) => updateParallel(index, value)"
          />
        </div>
      </div>

      <div class="space-y-3">
        <ToggleControl
          :model-value="!projectionStore.autoFitDomain"
          :label="t(projectionStore.autoFitDomain ? 'projectionParams.enableCustomScale' : 'projectionParams.disableCustomScale')"
          icon="ri-aspect-ratio-line"
          @update:model-value="(value: boolean) => projectionStore.setAutoFitDomain(!value)"
        />

        <ParameterInput
          v-if="!projectionStore.autoFitDomain && scaleMultiplierControl"
          :model-value="effectiveParams.scaleMultiplier ?? parameterRegistry.getDefaultValue('scaleMultiplier')"
          :label="t('projectionParams.scaleMultiplier')"
          :control="scaleMultiplierControl"
          @update:model-value="(value: number) => handleParameterChange('scaleMultiplier', value)"
        />
      </div>
    </div>
  </div>
</template>
