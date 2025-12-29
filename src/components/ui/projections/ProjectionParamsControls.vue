<script setup lang="ts">
/**
 * Projection Parameter Controls
 *
 * Controls for editing projection parameters in unified/split modes.
 * Uses canonical parameter format (focusLongitude/focusLatitude) via parameterStore,
 * matching the pattern used by TerritoryParameterControls in composite-custom mode.
 */
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

// Get current projection definition
const currentProjection = computed(() => {
  if (!projectionStore.selectedProjection) {
    return undefined
  }
  return projectionRegistry.get(projectionStore.selectedProjection)
})

// Get projection family for parameter constraints
const projectionFamily = computed<ProjectionFamilyType>(() => {
  return currentProjection.value?.family ?? 'OTHER'
})

// Get effective parameters from parameter store (atlas params + global overrides)
const effectiveParams = computed(() => parameterStore.globalEffectiveParameters)

// Get parameter constraints for this projection family
const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(projectionFamily.value)
})

// Get parameter range from registry
function getParameterRange(paramKey: keyof ProjectionParameters) {
  const constraints = parameterConstraints.value.constraints[paramKey]
  if (!constraints) {
    // Fallback ranges if constraint not found
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

// Get list of relevant parameters for this projection family
const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]: [string, any]) => constraint.relevant)
    .map(([key]) => key as keyof ProjectionParameters)
})

// Parameter range computed properties
const focusLongitudeRange = computed(() => getParameterRange('focusLongitude'))
const focusLatitudeRange = computed(() => getParameterRange('focusLatitude'))
const rotateGammaRange = computed(() => getParameterRange('rotateGamma'))
const parallel1Range = computed(() => getParameterRange('parallel1'))
const parallel2Range = computed(() => getParameterRange('parallel2'))
const scaleMultiplierRange = computed(() => getParameterRange('scaleMultiplier'))

// Check which parameters are relevant
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

// Check if projection supports latitude rotation (regardless of lock state)
const supportsLatitudeRotation = computed(() => {
  const projection = currentProjection.value
  if (!projection)
    return false
  const baseParams = getRelevantParameters(projection.family)
  return baseParams.rotateLatitude
})

// Check if there are any parameters to show
const hasAnyRelevantParams = computed(() => {
  return relevantParameters.value.length > 0 || true // Always show scale
})

// Check if parameters differ from preset defaults
const hasCustomParams = computed(() => {
  // Check if user has set any global parameter overrides that differ from preset
  const globalParams = parameterStore.globalParameters
  const globalDefaults = presetDefaults.presetGlobalParameters.value

  // If no global params set, nothing to reset
  if (Object.keys(globalParams).length === 0) {
    return false
  }

  // If no preset defaults, any params are custom
  if (!globalDefaults) {
    return true
  }

  // Check if any param differs from preset default
  for (const [key, value] of Object.entries(globalParams)) {
    const defaultValue = globalDefaults[key as keyof ProjectionParameters]
    // Simple comparison - arrays would need deep comparison
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

// Handle parameter value changes
function handleParameterChange(key: keyof ProjectionParameters, value: unknown) {
  parameterStore.setGlobalParameter(key, value)
}

// Reset all parameters to preset defaults
function reset() {
  // Clear all global parameter overrides
  // Atlas parameters (set by preset) will take effect automatically
  const currentParams = { ...parameterStore.globalParameters }
  for (const key of Object.keys(currentParams)) {
    // Reset by setting to undefined (which will fall back to atlas/preset defaults)
    parameterStore.setGlobalParameter(key as keyof ProjectionParameters, undefined)
  }
}
</script>

<template>
  <div>
    <!-- Projection Selector -->
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
      <!-- Reset Button -->
      <button
        class="btn btn-sm btn-soft w-full gap-1 mb-2"
        :disabled="!hasCustomParams"
        @click="reset"
      >
        <i class="ri-refresh-line" />
        {{ t('projectionParams.reset') }}
      </button>

      <!-- Position Parameters (Focus Longitude/Latitude - Canonical Format) -->
      <template v-if="hasFocusLongitudeParameter || hasFocusLatitudeParameter || hasRotateGammaParameter">
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-base-content/70 flex items-center gap-1">
            <i class="ri-compass-3-line" />
            {{ t('territory.parameters.projectionSpecific') }}
          </h4>

          <!-- Focus Longitude -->
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

          <!-- Latitude Lock Toggle (only show for projections that support latitude rotation) -->
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

            <!-- Focus Latitude -->
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

          <!-- Rotate Gamma (roll/tilt) -->
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

      <!-- Parallels (for conic projections) -->
      <template v-if="hasParallelsParameter">
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-base-content/70 flex items-center gap-1">
            <i class="ri-subtract-line" />
            {{ t('projectionParams.parallels') }}
          </h4>

          <!-- Parallel 1 -->
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

          <!-- Parallel 2 -->
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

      <!-- Scale Control Mode -->
      <div class="space-y-2">
        <h4 class="text-xs font-medium text-base-content/70 flex items-center gap-1">
          <i class="ri-zoom-in-line" />
          {{ t('territory.parameters.layout') }}
        </h4>

        <!-- Auto-fit Toggle -->
        <ToggleControl
          :model-value="!projectionStore.autoFitDomain"
          :label="t(projectionStore.autoFitDomain ? 'projectionParams.enableCustomScale' : 'projectionParams.disableCustomScale')"
          icon="ri-aspect-ratio-line"
          @update:model-value="(value: boolean) => projectionStore.setAutoFitDomain(!value)"
        />

        <!-- Scale Multiplier (only show when auto-fit is disabled) -->
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
