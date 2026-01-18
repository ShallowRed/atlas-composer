<script setup lang="ts">
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { TerritoryCode } from '@/types/branded'
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
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

interface Props {
  territoryCode: TerritoryCode
  territoryName: string
  projectionFamily: ProjectionFamilyType
  showInheritanceIndicators?: boolean
  allowParameterOverrides?: boolean
  showValidationFeedback?: boolean
}

interface Emits {
  (e: 'parameterChanged', territoryCode: TerritoryCode, key: keyof ProjectionParameters, value: unknown): void
  (e: 'overrideCleared', territoryCode: TerritoryCode, key: keyof ProjectionParameters): void
}

const props = withDefaults(defineProps<Props>(), {
  showInheritanceIndicators: true,
  allowParameterOverrides: true,
  showValidationFeedback: true,
  hideProjectionDropdown: false,
})

const emit = defineEmits<Emits>()
const { t } = useI18n()
const viewStore = useViewStore()
const parameterStore = useParameterStore()
const { resetTerritoryToDefaults } = useTerritoryTransforms()
const presetDefaults = getSharedPresetDefaults()

const isCompositeMode = computed(() => {
  return viewStore.viewMode === 'composite-custom'
})

const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(props.projectionFamily)
})

function getParameterRange(paramKey: keyof ProjectionParameters) {
  const constraints = parameterConstraints.value.constraints[paramKey]
  if (!constraints) {
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

const effectiveParameters = computed(() => {
  return parameterStore.getEffectiveParameters(props.territoryCode)
})

const territoryParameters = computed(() => {
  return parameterStore.getTerritoryParameters(props.territoryCode)
})

const validationResults = computed(() => {
  return parameterStore.validateTerritoryParameters(props.territoryCode, props.projectionFamily)
})

const hasOverrides = computed(() => {
  if (!presetDefaults.hasPresetDefaults()) {
    return Object.keys(territoryParameters.value).length > 0
  }

  const territoryDefaults = presetDefaults.getPresetDefaultsForTerritory(props.territoryCode)

  if (!territoryDefaults) {
    return Object.keys(territoryParameters.value).length > 0
  }

  const currentProjection = parameterStore.getTerritoryProjection(props.territoryCode)
  if (currentProjection && territoryDefaults.projection && currentProjection !== territoryDefaults.projection) {
    return true
  }

  const presetParams = territoryDefaults.parameters
  if (presetParams) {
    for (const [paramKey, currentValue] of Object.entries(territoryParameters.value)) {
      const presetValue = presetParams[paramKey as keyof typeof presetParams]

      const isEqual = areValuesEqual(currentValue, presetValue)

      if (!isEqual) {
        return true
      }
    }
  }

  return false
})

function areValuesEqual(value1: unknown, value2: unknown): boolean {
  const raw1 = toRaw(value1)
  const raw2 = toRaw(value2)

  if (raw1 === raw2)
    return true
  if (raw1 == null || raw2 == null)
    return false

  if (Array.isArray(raw1) && Array.isArray(raw2)) {
    if (raw1.length !== raw2.length)
      return false
    return raw1.every((val, index) => areValuesEqual(val, raw2[index]))
  }

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

  return raw1 === raw2
}

const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]: [string, any]) => constraint.relevant)
    .map(([key]) => key as keyof ProjectionParameters)
})

const validationErrors = computed(() => {
  return validationResults.value.filter(result => !result.isValid)
})

const validationWarnings = computed(() => {
  return validationResults.value.filter(result => result.isValid && result.warning)
})
const focusLongitudeRange = computed(() => getParameterRange('focusLongitude'))
const focusLatitudeRange = computed(() => getParameterRange('focusLatitude'))
const rotateGammaRange = computed(() => getParameterRange('rotateGamma'))
const parallel1Range = computed(() => getParameterRange('parallel1'))
const parallel2Range = computed(() => getParameterRange('parallel2'))
const clipAngleRange = computed(() => getParameterRange('clipAngle'))
const precisionRange = computed(() => getParameterRange('precision'))

const pixelClipExtentArray = computed(() => {
  const pixelClipExtent = effectiveParameters.value.pixelClipExtent
  if (pixelClipExtent && Array.isArray(pixelClipExtent) && pixelClipExtent.length === 4) {
    return pixelClipExtent
  }

  return [-100, -100, 100, 100]
})

function updatePixelClipExtent(index: number, value: number) {
  const current = [...pixelClipExtentArray.value]
  current[index] = value

  const pixelClipExtent: [number, number, number, number] = [
    current[0] ?? 0,
    current[1] ?? 0,
    current[2] ?? 0,
    current[3] ?? 0,
  ]

  handleParameterChange('pixelClipExtent', pixelClipExtent)
}

function handleParameterChange(key: keyof ProjectionParameters, value: unknown) {
  const validationResult = parameterStore.validateParameter(props.projectionFamily, key, value)

  if (validationResult.isValid || props.allowParameterOverrides) {
    parameterStore.setTerritoryParameter(props.territoryCode, key, value)
    emit('parameterChanged', props.territoryCode, key, value)
  }
}

function clearAllOverrides() {
  const oldParams = { ...territoryParameters.value }

  resetTerritoryToDefaults(props.territoryCode)
  Object.keys(oldParams).forEach((key) => {
    emit('overrideCleared', props.territoryCode, key as keyof ProjectionParameters)
  })
}

const hasPositionParameters = computed(() => {
  return relevantParameters.value.some(p =>
    String(p) === 'focusLongitude'
    || String(p) === 'focusLatitude'
    || String(p) === 'rotateGamma',
  )
})

const hasProjectionSpecificParameters = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'parallels')
})

const hasFocusLongitudeParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'focusLongitude')
})

const hasFocusLatitudeParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'focusLatitude')
})

const hasRotateGammaParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'rotateGamma')
})

const hasScaleParameter = computed(() => {
  return true
})

const hasClipAngleParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'clipAngle')
})

const hasPrecisionParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'precision')
})

const hasTranslateParameter = computed(() => {
  return true
})

onMounted(() => {
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

    <div
      v-if="relevantParameters.length > 0"
      class="join join-vertical border border-base-200 rounded-md"
    >
      <template v-if="hasPositionParameters || hasProjectionSpecificParameters">
        <details class="collapse collapse-plus join-item">
          <summary class="collapse-title text-sm font-medium">
            <i class="ri-compass-3-line mr-1" />
            {{ t('territory.parameters.projectionSpecific') }}
          </summary>

          <div class="collapse-content space-y-2">
            <template v-if="hasPositionParameters">
              <template v-if="hasFocusLongitudeParameter">
                <RangeSlider
                  :model-value="effectiveParameters.focusLongitude ?? 0"
                  :label="t('projectionParams.focusLongitude')"
                  icon="ri-map-pin-line"
                  size="xs"
                  :min="focusLongitudeRange.min"
                  :max="focusLongitudeRange.max"
                  :step="focusLongitudeRange.step"
                  unit="°"
                  @update:model-value="(value: number) => handleParameterChange('focusLongitude', value)"
                />
              </template>

              <template v-if="hasFocusLatitudeParameter">
                <RangeSlider
                  :model-value="effectiveParameters.focusLatitude ?? 0"
                  :label="t('projectionParams.focusLatitude')"
                  icon="ri-map-pin-2-line"
                  size="xs"
                  :min="focusLatitudeRange.min"
                  :max="focusLatitudeRange.max"
                  :step="focusLatitudeRange.step"
                  unit="°"
                  @update:model-value="(value: number) => handleParameterChange('focusLatitude', value)"
                />
              </template>

              <template v-if="hasRotateGammaParameter">
                <RangeSlider
                  :model-value="effectiveParameters.rotateGamma ?? 0"
                  :label="t('projectionParams.rotateGamma')"
                  icon="ri-compass-3-line"
                  size="xs"
                  :min="rotateGammaRange.min"
                  :max="rotateGammaRange.max"
                  :step="rotateGammaRange.step"
                  unit="°"
                  @update:model-value="(value: number) => handleParameterChange('rotateGamma', value)"
                />
              </template>
            </template>

            <template v-if="hasProjectionSpecificParameters">
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

      <template v-if="hasScaleParameter || hasTranslateParameter">
        <details class="collapse collapse-plus join-item">
          <summary class="collapse-title text-sm font-medium">
            <i class="ri-layout-line mr-1" />
            {{ t('territory.parameters.layout') }}
          </summary>

          <div class="collapse-content space-y-2">
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

            <template v-if="hasTranslateParameter && isCompositeMode">
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

      <template v-if="hasClipAngleParameter || hasPrecisionParameter || true">
        <details class="collapse collapse-plus join-item">
          <summary class="collapse-title text-sm font-medium">
            <i class="ri-settings-3-line mr-1" />
            {{ t('territory.parameters.advanced') }}
          </summary>

          <div class="collapse-content space-y-2">
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

    <Alert
      v-if="relevantParameters.length === 0"
      type="info"
      :title="t('territory.parameters.noRelevantParameters')"
      :message="t('territory.parameters.noRelevantParametersMessage', { family: projectionFamily })"
    />
  </div>
</template>
