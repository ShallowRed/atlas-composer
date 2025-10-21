<!--
  Territory Parameter Controls

  Component for editing projection parameters specific to a territory.
  Used in both split mode and composite-custom mode.

  Architectural Pattern:
  - Parent component (SplitControls/CompositeCustomControls) handles projection selection
  - This component focuses solely on parameter editing for the selected projection
  - Provides parameter controls with inheritance indicators and validation feedback

  Separation of Concerns:
  - Projection selection: Parent's responsibility
  - Parameter editing: This component's responsibility
-->
<script setup lang="ts">
import type { ProjectionFamilyType } from '@/core/projections/types'
import type {
  ProjectionParameters,
} from '@/types/projection-parameters'

import { computed, onMounted, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'

import ParameterValidationFeedback from '@/components/ui/parameters/ParameterValidationFeedback.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { useConfigStore } from '@/stores/config'
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
  hideProjectionDropdown: false,
})

const emit = defineEmits<Emits>()
const { t } = useI18n()
const configStore = useConfigStore()
const parameterStore = useParameterStore()
const { resetTerritoryToDefaults } = useTerritoryTransforms()
const presetDefaults = getSharedPresetDefaults()

// Check if we're in composite mode - composite-specific parameters only apply there
const isCompositeMode = computed(() => {
  return configStore.viewMode === 'composite-custom'
})

// Get parameter constraints for this projection family
const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(props.projectionFamily)
})

// Get parameter constraints from parameter registry
function getParameterRange(paramKey: keyof ProjectionParameters) {
  const constraints = parameterConstraints.value.constraints[paramKey]
  if (!constraints) {
    // Fallback ranges if constraint not found
    const fallbackRanges: Record<string, { min: number, max: number, step: number }> = {
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
    return fallbackRanges[paramKey as string] || { min: 0, max: 100, step: 1 }
  }

  return {
    min: constraints.min ?? 0,
    max: constraints.max ?? 100,
    step: constraints.step ?? 1,
  }
}

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

// Check if territory has parameter overrides that differ from preset defaults
const hasOverrides = computed(() => {
  // If no preset defaults loaded, show the reset button if there are any overrides
  if (!presetDefaults.hasPresetDefaults()) {
    return Object.keys(territoryParameters.value).length > 0
  }

  // Get preset defaults for this specific territory
  const territoryDefaults = presetDefaults.getPresetDefaultsForTerritory(props.territoryCode)

  // If no preset defaults for this territory, show the reset button if there are any overrides
  if (!territoryDefaults) {
    return Object.keys(territoryParameters.value).length > 0
  }

  // Check if projection differs from preset
  const currentProjection = parameterStore.getTerritoryProjection(props.territoryCode)
  if (currentProjection && territoryDefaults.projection && currentProjection !== territoryDefaults.projection) {
    return true
  }

  // Check if any current parameter differs from preset defaults
  const presetParams = territoryDefaults.parameters
  if (presetParams) {
    for (const [paramKey, currentValue] of Object.entries(territoryParameters.value)) {
      const presetValue = presetParams[paramKey as keyof typeof presetParams]

      // Use the same deep comparison logic as the global reset button
      const isEqual = areValuesEqual(currentValue, presetValue)

      if (!isEqual) {
        return true
      }
    }
  }

  return false
})

// Helper function for deep value comparison (same as in usePresetDefaults)
function areValuesEqual(value1: unknown, value2: unknown): boolean {
  // Unwrap Vue proxies to get raw values
  const raw1 = toRaw(value1)
  const raw2 = toRaw(value2)

  // Handle null/undefined
  if (raw1 === raw2)
    return true
  if (raw1 == null || raw2 == null)
    return false

  // Handle arrays
  if (Array.isArray(raw1) && Array.isArray(raw2)) {
    if (raw1.length !== raw2.length)
      return false
    return raw1.every((val, index) => areValuesEqual(val, raw2[index]))
  }

  // Handle objects
  if (typeof raw1 === 'object' && typeof raw2 === 'object') {
    const keys1 = Object.keys(raw1 as Record<string, unknown>)
    const keys2 = Object.keys(raw2 as Record<string, unknown>)
    if (keys1.length !== keys2.length)
      return false
    return keys1.every(key =>
      areValuesEqual(
        (raw1 as Record<string, unknown>)[key],
        (raw2 as Record<string, unknown>)[key],
      ),
    )
  }

  // Primitives
  return raw1 === raw2
}

// Get list of relevant parameters for this projection family
const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]: [string, any]) => constraint.relevant)
    .map(([key]) => key as keyof ProjectionParameters)
})

// Get validation errors for display
const validationErrors = computed(() => {
  return validationResults.value.filter(result => !result.isValid)
})

const validationWarnings = computed(() => {
  return validationResults.value.filter(result => result.isValid && result.warning)
})

// Parameter ranges from registry
const centerLongitudeRange = computed(() => getParameterRange('centerLongitude'))
const centerLatitudeRange = computed(() => getParameterRange('centerLatitude'))
const rotateLongitudeRange = computed(() => getParameterRange('rotateLongitude'))
const rotateLatitudeRange = computed(() => getParameterRange('rotateLatitude'))
// const rotateGammaRange = computed(() => getParameterRange('rotateGamma'))
const parallel1Range = computed(() => getParameterRange('parallel1'))
const parallel2Range = computed(() => getParameterRange('parallel2'))
const clipAngleRange = computed(() => getParameterRange('clipAngle'))
const precisionRange = computed(() => getParameterRange('precision'))

// Pixel-based clip extent handling
const pixelClipExtentArray = computed(() => {
  const pixelClipExtent = effectiveParameters.value.pixelClipExtent
  if (pixelClipExtent && Array.isArray(pixelClipExtent) && pixelClipExtent.length === 4) {
    // Already in [x1, y1, x2, y2] format
    return pixelClipExtent
  }

  // Default values if no clip extent is set
  return [-100, -100, 100, 100]
})

function updatePixelClipExtent(index: number, value: number) {
  const current = [...pixelClipExtentArray.value]
  current[index] = value

  // Keep as [x1, y1, x2, y2] format
  const pixelClipExtent: [number, number, number, number] = [
    current[0] ?? 0,
    current[1] ?? 0,
    current[2] ?? 0,
    current[3] ?? 0,
  ]

  handleParameterChange('pixelClipExtent', pixelClipExtent)
}

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

// Clear all parameter overrides for this territory and reset transforms to preset defaults
function clearAllOverrides() {
  // Get current parameters before clearing for emit
  const oldParams = { ...territoryParameters.value }

  // Reset all territory-specific settings (transforms + parameters) to preset defaults
  // This also triggers cartographer update internally
  resetTerritoryToDefaults(props.territoryCode)

  // Emit cleared events for all overridden parameters
  Object.keys(oldParams).forEach((key) => {
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

const hasCenterParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'center')
})

const hasRotateParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'rotate')
})

const hasScaleParameter = computed(() => {
  // Scale is always user-controllable regardless of projection family
  return true
})

const hasClipAngleParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'clipAngle')
})

const hasPrecisionParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'precision')
})

const hasTranslateParameter = computed(() => {
  // Translate is always user-controllable regardless of projection family
  return true
})

// Lifecycle hooks for validation
onMounted(() => {
  // Trigger initial validation
  parameterStore.validateTerritoryParameters(props.territoryCode, props.projectionFamily)
})
</script>

<template>
  <div class="territory-parameter-controls">
    <button
      :disabled="!hasOverrides"
      class="btn btn-sm btn-soft w-full mb-4"
      :title="t('territory.parameters.resetOverrides')"
      @click="clearAllOverrides"
    >
      <i class="ri-restart-line" />
      {{ t('territory.parameters.reset') }}
    </button>

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
    <div
      v-if="relevantParameters.length > 0"
      class="join join-vertical border border-base-200 rounded-md"
    >
      <!-- Main Projection Controls (Center/Rotation/Parallels) -->
      <template v-if="hasPositionParameters || hasProjectionSpecificParameters">
        <details class="collapse collapse-plus join-item">
          <summary class="collapse-title text-sm font-medium">
            <i class="ri-compass-3-line mr-1" />
            {{ t('territory.parameters.projectionSpecific') }}
          </summary>

          <div class="collapse-content space-y-2">
            <!-- Position Parameters (Center/Rotation) -->
            <template v-if="hasPositionParameters">
              <!-- Center Controls (for conic projections) -->
              <template v-if="hasCenterParameter">
                <!-- Center Longitude -->
                <RangeSlider
                  :model-value="effectiveParameters.center?.[0] ?? 0"
                  :label="t('projectionParams.centerLongitude')"
                  icon="ri-map-pin-line"
                  size="xs"
                  :min="centerLongitudeRange.min"
                  :max="centerLongitudeRange.max"
                  :step="centerLongitudeRange.step"
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
                  :min="centerLatitudeRange.min"
                  :max="centerLatitudeRange.max"
                  :step="centerLatitudeRange.step"
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
                  :min="rotateLongitudeRange.min"
                  :max="rotateLongitudeRange.max"
                  :step="rotateLongitudeRange.step"
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
                  :min="rotateLatitudeRange.min"
                  :max="rotateLatitudeRange.max"
                  :step="rotateLatitudeRange.step"
                  unit="°"
                  @update:model-value="(value: number) => {
                    const currentRotate = effectiveParameters.rotate ?? [0, 0, 0]
                    handleParameterChange('rotate', [currentRotate[0], value, currentRotate[2] ?? 0])
                  }"
                />
              </template>
            </template>

            <!-- Parallels (for conic projections) -->
            <template v-if="hasProjectionSpecificParameters">
              <!-- Parallel 1 (Standard parallel) -->
              <RangeSlider
                :model-value="effectiveParameters.parallels?.[0] ?? 30"
                :label="t('projectionParams.parallel1')"
                icon="ri-equalizer-line"
                size="xs"
                :min="parallel1Range.min"
                :max="parallel1Range.max"
                :step="parallel1Range.step"
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
                :min="parallel2Range.min"
                :max="parallel2Range.max"
                :step="parallel2Range.step"
                unit="°"
                @update:model-value="(value: number) => {
                  const currentParallels = effectiveParameters.parallels ?? [30, 60]
                  handleParameterChange('parallels', [currentParallels[0], value])
                }"
              />
            </template>
          </div>
        </details>
      </template>

      <!-- Layout Controls (Scale/Translate) -->
      <template v-if="hasScaleParameter || hasTranslateParameter">
        <details class="collapse collapse-plus join-item">
          <summary class="collapse-title text-sm font-medium">
            <i class="ri-layout-line mr-1" />
            {{ t('territory.parameters.layout') }}
          </summary>

          <div class="collapse-content space-y-2">
            <!-- Scale Control -->
            <template v-if="hasScaleParameter">
              <RangeSlider
                :model-value="effectiveParameters.scaleMultiplier ?? 1.0"
                :label="t('projectionParams.scaleMultiplier')"
                icon="ri-zoom-in-line"
                size="xs"
                :min="0.1"
                :max="10"
                :step="0.1"
                unit="×"
                @update:model-value="(value: number) => handleParameterChange('scaleMultiplier', value)"
              />
            </template>

            <!-- Translate Offset Control (composite mode only) -->
            <template v-if="hasTranslateParameter && isCompositeMode">
              <!-- Translate Offset X -->
              <RangeSlider
                :model-value="effectiveParameters.translateOffset?.[0] ?? 0"
                label="Translate X"
                icon="ri-arrow-left-right-line"
                size="xs"
                :min="-1000"
                :max="1000"
                :step="5"
                unit="px"
                @update:model-value="(value: number) => {
                  const currentTranslateOffset = effectiveParameters.translateOffset ?? [0, 0]
                  handleParameterChange('translateOffset', [value, currentTranslateOffset[1]])
                }"
              />

              <!-- Translate Offset Y -->
              <RangeSlider
                :model-value="effectiveParameters.translateOffset?.[1] ?? 0"
                label="Translate Y"
                icon="ri-arrow-up-down-line"
                size="xs"
                :min="-1000"
                :max="1000"
                :step="10"
                unit="px"
                @update:model-value="(value: number) => {
                  const currentTranslateOffset = effectiveParameters.translateOffset ?? [0, 0]
                  handleParameterChange('translateOffset', [currentTranslateOffset[0], value])
                }"
              />
              <!-- Pixel-based ClipExtent Controls (composite mode only) -->
              <RangeSlider
                :model-value="pixelClipExtentArray[0] ?? -100"
                :label="t('clipExtent.left')"
                icon="ri-arrow-left-line"
                size="xs"
                :min="-500"
                :max="500"
                :step="10"
                @update:model-value="(value: number) => updatePixelClipExtent(0, value)"
              />

              <RangeSlider
                :model-value="pixelClipExtentArray[1] ?? -100"
                :label="t('clipExtent.top')"
                icon="ri-arrow-up-line"
                size="xs"
                :min="-500"
                :max="500"
                :step="10"
                @update:model-value="(value: number) => updatePixelClipExtent(1, value)"
              />

              <RangeSlider
                :model-value="pixelClipExtentArray[2] ?? 100"
                :label="t('clipExtent.right')"
                icon="ri-arrow-right-line"
                size="xs"
                :min="-500"
                :max="500"
                :step="10"
                @update:model-value="(value: number) => updatePixelClipExtent(2, value)"
              />

              <RangeSlider
                :model-value="pixelClipExtentArray[3] ?? 100"
                :label="t('clipExtent.bottom')"
                icon="ri-arrow-down-line"
                size="xs"
                :min="-500"
                :max="500"
                :step="10"
                @update:model-value="(value: number) => updatePixelClipExtent(3, value)"
              />
            </template>
          </div>
        </details>
      </template>

      <!-- Advanced Controls (Clip Angle/Precision) -->
      <template v-if="hasClipAngleParameter || hasPrecisionParameter || true">
        <details class="collapse collapse-plus join-item">
          <summary class="collapse-title text-sm font-medium">
            <i class="ri-settings-3-line mr-1" />
            {{ t('territory.parameters.advanced') }}
          </summary>

          <div class="collapse-content space-y-2">
            <!-- Clip Angle (for azimuthal projections) -->
            <template v-if="hasClipAngleParameter">
              <RangeSlider
                :model-value="effectiveParameters.clipAngle ?? 90"
                label="Clip Angle"
                icon="ri-crop-line"
                size="xs"
                :min="clipAngleRange.min"
                :max="clipAngleRange.max"
                :step="clipAngleRange.step"
                unit="°"
                @update:model-value="(value: number) => handleParameterChange('clipAngle', value)"
              />
            </template>

            <!-- Precision Control -->
            <template v-if="hasPrecisionParameter">
              <RangeSlider
                :model-value="effectiveParameters.precision ?? 0.1"
                label="Precision"
                icon="ri-focus-3-line"
                size="xs"
                :min="precisionRange.min"
                :max="precisionRange.max"
                :step="precisionRange.step"
                @update:model-value="(value: number) => handleParameterChange('precision', value)"
              />
            </template>
          </div>
        </details>
      </template>
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
