<!--
  Territory Parameter Controls

  Component for editing projection parameters specific to a territory
  in custom composite mode. Provides full parameter controls with
  inheritance indicators and validation feedback.
-->
<script setup lang="ts">
import type { ProjectionFamilyType } from '@/core/projections/types'
import type {
  ProjectionParameters,
} from '@/types/projection-parameters'

import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ParameterValidationFeedback from '@/components/ui/parameters/ParameterValidationFeedback.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { useParameterStore } from '@/stores/parameters'

interface Props {
  /** Territory code for parameter management */
  territoryCode: string
  /** Territory display name */
  territoryName: string
  /** Projection family for parameter validation and constraints */
  projectionFamily: ProjectionFamilyType
  /** Whether to show parameter inheritance indicators */
  showInheritanceIndicators?: boolean
  /** Whether to allow parameter overrides at territory level */
  allowParameterOverrides?: boolean
  /** Whether to show validation feedback */
  showValidationFeedback?: boolean
}

interface Emits {
  (e: 'parameterChanged', territoryCode: string, key: keyof ProjectionParameters, value: unknown): void
  (e: 'overrideCleared', territoryCode: string, key: keyof ProjectionParameters): void
}

const props = withDefaults(defineProps<Props>(), {
  showInheritanceIndicators: true,
  allowParameterOverrides: true,
  showValidationFeedback: true,
})

const emit = defineEmits<Emits>()
const { t } = useI18n()
const parameterStore = useParameterStore()

// Parameter ranges for sliders
const PARAMETER_RANGES = {
  centerLongitude: { min: -180, max: 180, step: 1 },
  centerLatitude: { min: -90, max: 90, step: 1 },
  rotateLongitude: { min: -180, max: 180, step: 1 },
  rotateLatitude: { min: -90, max: 90, step: 1 },
  rotateGamma: { min: -180, max: 180, step: 1 },
  parallel1: { min: -90, max: 90, step: 1 },
  parallel2: { min: -90, max: 90, step: 1 },
  scale: { min: 100, max: 10000, step: 50 },
  clipAngle: { min: 0, max: 180, step: 1 },
  precision: { min: 0.01, max: 10, step: 0.01 },
}

// Get parameter constraints for this projection family
const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(props.projectionFamily)
})

// Get current effective parameters for this territory
const effectiveParameters = computed(() => {
  return parameterStore.getEffectiveParameters(props.territoryCode)
})

// Get territory-specific parameter overrides
const territoryParameters = computed(() => {
  return parameterStore.getTerritoryParameters(props.territoryCode)
})

// Get validation results for current parameters
const validationResults = computed(() => {
  return parameterStore.validateTerritoryParameters(props.territoryCode, props.projectionFamily)
})

// Check if territory has any parameter overrides
const hasOverrides = computed(() => {
  return Object.keys(territoryParameters.value).length > 0
})

// Get list of relevant parameters for this projection family
const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]) => constraint.relevant)
    .map(([key]) => key as keyof ProjectionParameters)
})

// Get validation errors for display
const validationErrors = computed(() => {
  return validationResults.value.filter(result => !result.isValid)
})

const validationWarnings = computed(() => {
  return validationResults.value.filter(result => result.isValid && result.warning)
})

// Handle parameter value changes
function handleParameterChange(key: keyof ProjectionParameters, value: unknown) {
  // Validate the parameter before setting
  const validationResult = parameterStore.validateParameter(props.projectionFamily, key, value)

  if (validationResult.isValid || props.allowParameterOverrides) {
    // Set the parameter value
    parameterStore.setTerritoryParameter(props.territoryCode, key, value)

    // Emit change event
    emit('parameterChanged', props.territoryCode, key, value)
  }
}

// Clear all parameter overrides for this territory
function clearAllOverrides() {
  parameterStore.clearAllTerritoryOverrides(props.territoryCode)

  // Emit cleared events for all overridden parameters
  Object.keys(territoryParameters.value).forEach((key) => {
    emit('overrideCleared', props.territoryCode, key as keyof ProjectionParameters)
  })
}

// Helper computed properties for parameter groups
const hasPositionParameters = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'center' || String(p) === 'rotate')
})

const hasProjectionSpecificParameters = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'parallels')
})

const hasViewParameters = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'scale' || String(p) === 'clipAngle')
})

const hasAdvancedParameters = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'precision' || String(p) === 'translate')
})

const hasCenterParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'center')
})

const hasRotateParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'rotate')
})

const hasScaleParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'scale')
})

const hasClipAngleParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'clipAngle')
})

const hasPrecisionParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'precision')
})

const hasTranslateParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'translate')
})

// Lifecycle hooks for validation
onMounted(() => {
  // Trigger initial validation
  parameterStore.validateTerritoryParameters(props.territoryCode, props.projectionFamily)
})

onUnmounted(() => {
  // Clean up validation errors for this territory
  // This would be handled by the store's internal cleanup
})
</script>

<template>
  <div class="territory-parameter-controls">
    <!-- Header with territory name and reset button -->
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-lg font-semibold">
        {{ territoryName }}
      </h4>

      <button
        v-if="hasOverrides"
        class="btn btn-sm btn-ghost"
        :title="t('territory.parameters.resetOverrides')"
        @click="clearAllOverrides"
      >
        <i class="ri-restart-line" />
        {{ t('territory.parameters.reset') }}
      </button>
    </div>

    <!-- Validation feedback -->
    <div
      v-if="showValidationFeedback && (validationErrors.length > 0 || validationWarnings.length > 0)"
      class="mb-4"
    >
      <ParameterValidationFeedback
        :errors="validationErrors"
        :warnings="validationWarnings"
        :territory-code="territoryCode"
      />
    </div>

    <!-- Parameter controls grouped by type -->
    <div class="space-y-6">
      <!-- Position Parameters (Center/Rotation) -->
      <div v-if="hasPositionParameters">
        <h5 class="text-sm font-medium mb-3 text-base-content/70">
          <i class="ri-compass-3-line mr-1" />
          {{ t('territory.parameters.position') }}
        </h5>

        <div class="space-y-4">
          <!-- Center Controls (for conic projections) -->
          <template v-if="hasCenterParameter">
            <!-- Center Longitude -->
            <RangeSlider
              :model-value="effectiveParameters.center?.[0] ?? 0"
              :label="t('projectionParams.centerLongitude')"
              icon="ri-map-pin-line"
              size="xs"
              :min="PARAMETER_RANGES.centerLongitude.min"
              :max="PARAMETER_RANGES.centerLongitude.max"
              :step="PARAMETER_RANGES.centerLongitude.step"
              unit="°"
              @update:model-value="(value: number) => {
                const currentCenter = effectiveParameters.center ?? [0, 0]
                handleParameterChange('center', [value, currentCenter[1]])
              }"
            />

            <!-- Center Latitude -->
            <RangeSlider
              :model-value="effectiveParameters.center?.[1] ?? 0"
              :label="t('projectionParams.centerLatitude')"
              icon="ri-map-pin-2-line"
              size="xs"
              :min="PARAMETER_RANGES.centerLatitude.min"
              :max="PARAMETER_RANGES.centerLatitude.max"
              :step="PARAMETER_RANGES.centerLatitude.step"
              unit="°"
              @update:model-value="(value: number) => {
                const currentCenter = effectiveParameters.center ?? [0, 0]
                handleParameterChange('center', [currentCenter[0], value])
              }"
            />
          </template>

          <!-- Rotate Controls -->
          <template v-if="hasRotateParameter">
            <!-- Rotate Longitude -->
            <RangeSlider
              :model-value="effectiveParameters.rotate?.[0] ?? 0"
              :label="t('projectionParams.rotateLongitude')"
              icon="ri-compass-3-line"
              size="xs"
              :min="PARAMETER_RANGES.rotateLongitude.min"
              :max="PARAMETER_RANGES.rotateLongitude.max"
              :step="PARAMETER_RANGES.rotateLongitude.step"
              unit="°"
              @update:model-value="(value: number) => {
                const currentRotate = effectiveParameters.rotate ?? [0, 0, 0]
                handleParameterChange('rotate', [value, currentRotate[1], currentRotate[2] ?? 0])
              }"
            />

            <!-- Rotate Latitude -->
            <RangeSlider
              :model-value="effectiveParameters.rotate?.[1] ?? 0"
              :label="t('projectionParams.rotateLatitude')"
              icon="ri-compass-4-line"
              size="xs"
              :min="PARAMETER_RANGES.rotateLatitude.min"
              :max="PARAMETER_RANGES.rotateLatitude.max"
              :step="PARAMETER_RANGES.rotateLatitude.step"
              unit="°"
              @update:model-value="(value: number) => {
                const currentRotate = effectiveParameters.rotate ?? [0, 0, 0]
                handleParameterChange('rotate', [currentRotate[0], value, currentRotate[2] ?? 0])
              }"
            />
          </template>
        </div>
      </div>

      <!-- Projection-Specific Parameters -->
      <div v-if="hasProjectionSpecificParameters">
        <h5 class="text-sm font-medium mb-3 text-base-content/70">
          <i class="ri-equalizer-line mr-1" />
          {{ t('territory.parameters.projectionSpecific') }}
        </h5>

        <div class="space-y-4">
          <!-- Parallels (for conic projections) -->
          <!-- Parallel 1 (Standard parallel) -->
          <RangeSlider
            :model-value="effectiveParameters.parallels?.[0] ?? 30"
            :label="t('projectionParams.parallel1')"
            icon="ri-equalizer-line"
            size="xs"
            :min="PARAMETER_RANGES.parallel1.min"
            :max="PARAMETER_RANGES.parallel1.max"
            :step="PARAMETER_RANGES.parallel1.step"
            unit="°"
            @update:model-value="(value: number) => {
              const currentParallels = effectiveParameters.parallels ?? [30, 60]
              handleParameterChange('parallels', [value, currentParallels[1]])
            }"
          />

          <!-- Parallel 2 (Standard parallel) -->
          <RangeSlider
            :model-value="effectiveParameters.parallels?.[1] ?? 60"
            :label="t('projectionParams.parallel2')"
            icon="ri-equalizer-line"
            size="xs"
            :min="PARAMETER_RANGES.parallel2.min"
            :max="PARAMETER_RANGES.parallel2.max"
            :step="PARAMETER_RANGES.parallel2.step"
            unit="°"
            @update:model-value="(value: number) => {
              const currentParallels = effectiveParameters.parallels ?? [30, 60]
              handleParameterChange('parallels', [currentParallels[0], value])
            }"
          />
        </div>
      </div>

      <!-- View Parameters -->
      <div v-if="hasViewParameters">
        <h5 class="text-sm font-medium mb-3 text-base-content/70">
          <i class="ri-zoom-in-line mr-1" />
          {{ t('territory.parameters.view') }}
        </h5>

        <div class="space-y-4">
          <!-- Scale Control -->
          <template v-if="hasScaleParameter">
            <RangeSlider
              :model-value="effectiveParameters.scale ?? 1000"
              label="Scale"
              icon="ri-zoom-in-line"
              size="xs"
              :min="PARAMETER_RANGES.scale.min"
              :max="PARAMETER_RANGES.scale.max"
              :step="PARAMETER_RANGES.scale.step"
              @update:model-value="(value: number) => handleParameterChange('scale', value)"
            />
          </template>

          <!-- Clip Angle (for azimuthal projections) -->
          <template v-if="hasClipAngleParameter">
            <RangeSlider
              :model-value="effectiveParameters.clipAngle ?? 90"
              label="Clip Angle"
              icon="ri-crop-line"
              size="xs"
              :min="PARAMETER_RANGES.clipAngle.min"
              :max="PARAMETER_RANGES.clipAngle.max"
              :step="PARAMETER_RANGES.clipAngle.step"
              unit="°"
              @update:model-value="(value: number) => handleParameterChange('clipAngle', value)"
            />
          </template>
        </div>
      </div>

      <!-- Advanced Parameters -->
      <div v-if="hasAdvancedParameters">
        <details class="collapse collapse-arrow">
          <summary class="collapse-title text-sm font-medium">
            <i class="ri-settings-3-line mr-1" />
            {{ t('territory.parameters.advanced') }}
          </summary>

          <div class="collapse-content space-y-4">
            <!-- Precision Control -->
            <template v-if="hasPrecisionParameter">
              <RangeSlider
                :model-value="effectiveParameters.precision ?? 0.1"
                label="Precision"
                icon="ri-focus-3-line"
                size="xs"
                :min="PARAMETER_RANGES.precision.min"
                :max="PARAMETER_RANGES.precision.max"
                :step="PARAMETER_RANGES.precision.step"
                @update:model-value="(value: number) => handleParameterChange('precision', value)"
              />
            </template>

            <!-- Translate Control -->
            <template v-if="hasTranslateParameter">
              <!-- Translate X -->
              <RangeSlider
                :model-value="effectiveParameters.translate?.[0] ?? 0"
                label="Translate X"
                icon="ri-arrow-left-right-line"
                size="xs"
                :min="-1000"
                :max="1000"
                :step="10"
                unit="px"
                @update:model-value="(value: number) => {
                  const currentTranslate = effectiveParameters.translate ?? [0, 0]
                  handleParameterChange('translate', [value, currentTranslate[1]])
                }"
              />

              <!-- Translate Y -->
              <RangeSlider
                :model-value="effectiveParameters.translate?.[1] ?? 0"
                label="Translate Y"
                icon="ri-arrow-up-down-line"
                size="xs"
                :min="-1000"
                :max="1000"
                :step="10"
                unit="px"
                @update:model-value="(value: number) => {
                  const currentTranslate = effectiveParameters.translate ?? [0, 0]
                  handleParameterChange('translate', [currentTranslate[0], value])
                }"
              />
            </template>
          </div>
        </details>
      </div>
    </div>

    <!-- No relevant parameters message -->
    <Alert
      v-if="relevantParameters.length === 0"
      type="info"
      :title="t('territory.parameters.noRelevantParameters')"
      :message="t('territory.parameters.noRelevantParametersMessage', { family: projectionFamily })"
    />
  </div>
</template>
