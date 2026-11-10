<script setup lang="ts">
import type { PositioningView, PositionParameter } from '@/core/positioning'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { TerritoryCode } from '@/types/branded'
import type {
  ProjectionParameters,
} from '@/types/projection-parameters'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'

import ParameterValidationFeedback from '@/components/ui/parameters/ParameterValidationFeedback.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { parameterRegistry } from '@/core/parameters'
import { getDisplayedCenter, getDisplayedRotate, getPositionParameter, updatePositioningAxis } from '@/core/positioning'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useViewStore } from '@/stores/view'

interface Props {
  territoryCode: TerritoryCode
  territoryName: string
  projectionFamily: ProjectionFamilyType
  view: PositioningView
  showInheritanceIndicators?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showInheritanceIndicators: true,
  hideProjectionDropdown: false,
})

const { t } = useI18n()
const viewStore = useViewStore()
const parameterStore = useParameterStore()
const { resetTerritoryToDefaults } = useTerritoryTransforms()
const presetDefaults = usePresetDefaultsStore()

const isCompositeMode = computed(() => {
  return viewStore.viewMode === 'composite-custom'
})

const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(props.projectionFamily)
})

const rotateRanges = computed(() => parameterStore.getTupleRanges(props.projectionFamily, 'rotate'))
const centerRanges = computed(() => parameterStore.getTupleRanges(props.projectionFamily, 'center'))
const parallelsRanges = computed(() => parameterStore.getTupleRanges(props.projectionFamily, 'parallels'))
const translateOffsetRanges = computed(() => parameterStore.getTupleRanges(props.projectionFamily, 'translateOffset'))
const pixelClipExtentRanges = computed(() => parameterStore.getTupleRanges(props.projectionFamily, 'pixelClipExtent'))
const scaleMultiplierRange = computed(() => parameterStore.getNumberRange(props.projectionFamily, 'scaleMultiplier'))
const clipAngleRange = computed(() => parameterStore.getNumberRange(props.projectionFamily, 'clipAngle'))
const precisionRange = computed(() => parameterStore.getNumberRange(props.projectionFamily, 'precision'))

const effectiveParameters = computed(() => {
  return parameterStore.getEffectiveParameters(props.territoryCode)
})

const parallels = computed(() => effectiveParameters.value.parallels ?? parameterRegistry.getDefaultValue('parallels'))

const rotate = computed(() => getDisplayedRotate(effectiveParameters.value, props.view))

const center = computed(() => getDisplayedCenter(effectiveParameters.value))

const territoryParameters = computed(() => {
  return parameterStore.getTerritoryParameters(props.territoryCode)
})

const validationIssues = computed(() => {
  return parameterStore.validateTerritoryParameters(props.territoryCode, props.projectionFamily)
})

const hasOverrides = computed(() => presetDefaults.territoryDiffersFromPreset(props.territoryCode, territoryParameters.value))

const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]: [string, any]) => constraint.relevant)
    .map(([key]) => key as keyof ProjectionParameters)
})

const pixelClipExtentArray = computed(() => {
  return effectiveParameters.value.pixelClipExtent ?? parameterRegistry.getDefaultValue('pixelClipExtent')
})

function updatePixelClipExtent(index: number, value: number) {
  const pixelClipExtent = [...pixelClipExtentArray.value] as [number, number, number, number]
  pixelClipExtent[index] = value

  handleParameterChange('pixelClipExtent', pixelClipExtent)
}

function handleParameterChange(key: keyof ProjectionParameters, value: unknown) {
  parameterStore.setTerritoryParameter(props.territoryCode, key, value)
}

function handlePositioningChange(key: PositionParameter, axis: number, value: number) {
  const positioning = updatePositioningAxis(effectiveParameters.value, props.view, key, axis, value)
  parameterStore.setTerritoryParameters(props.territoryCode, positioning)
}

function clearAllOverrides() {
  resetTerritoryToDefaults(props.territoryCode)
}

const hasPositionParameters = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'rotate' || String(p) === 'center')
})

const hasProjectionSpecificParameters = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'parallels')
})

function isNonNull(values?: number[]) {
  return values?.some(value => value !== 0) ?? false
}

const positionParameter = computed(() => getPositionParameter(props.projectionFamily, props.view))

const showRotate = computed(() => {
  return positionParameter.value === 'rotate'
    || (props.view === 'composite' && isNonNull(effectiveParameters.value.rotate))
})

const showCenter = computed(() => {
  return props.view === 'composite'
    && (positionParameter.value === 'center' || isNonNull(effectiveParameters.value.center))
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
      v-if="validationIssues.length > 0"
      class="mb-4"
    >
      <ParameterValidationFeedback :issues="validationIssues" />
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
              <template v-if="showRotate && rotateRanges">
                <RangeSlider
                  :model-value="rotate[0]"
                  :label="t('projectionParams.rotateLongitude')"
                  icon="ri-map-pin-line"
                  size="xs"
                  :min="rotateRanges[0].min"
                  :max="rotateRanges[0].max"
                  :step="rotateRanges[0].step"
                  unit="°"
                  @update:model-value="(value: number) => handlePositioningChange('rotate', 0, value)"
                />

                <RangeSlider
                  :model-value="rotate[1]"
                  :label="t('projectionParams.rotateLatitude')"
                  icon="ri-map-pin-2-line"
                  size="xs"
                  :min="rotateRanges[1].min"
                  :max="rotateRanges[1].max"
                  :step="rotateRanges[1].step"
                  unit="°"
                  @update:model-value="(value: number) => handlePositioningChange('rotate', 1, value)"
                />

                <RangeSlider
                  :model-value="rotate[2]"
                  :label="t('projectionParams.rotation')"
                  icon="ri-compass-3-line"
                  size="xs"
                  :min="rotateRanges[2].min"
                  :max="rotateRanges[2].max"
                  :step="rotateRanges[2].step"
                  unit="°"
                  @update:model-value="(value: number) => handlePositioningChange('rotate', 2, value)"
                />
              </template>

              <template v-if="showCenter && centerRanges">
                <RangeSlider
                  :model-value="center[0]"
                  :label="t('projectionParams.centerLongitude')"
                  icon="ri-map-pin-line"
                  size="xs"
                  :min="centerRanges[0].min"
                  :max="centerRanges[0].max"
                  :step="centerRanges[0].step"
                  unit="°"
                  @update:model-value="(value: number) => handlePositioningChange('center', 0, value)"
                />

                <RangeSlider
                  :model-value="center[1]"
                  :label="t('projectionParams.centerLatitude')"
                  icon="ri-map-pin-2-line"
                  size="xs"
                  :min="centerRanges[1].min"
                  :max="centerRanges[1].max"
                  :step="centerRanges[1].step"
                  unit="°"
                  @update:model-value="(value: number) => handlePositioningChange('center', 1, value)"
                />
              </template>
            </template>

            <template v-if="hasProjectionSpecificParameters && parallelsRanges">
              <RangeSlider
                :model-value="parallels[0]"
                :label="t('projectionParams.parallel1')"
                icon="ri-equalizer-line"
                size="xs"
                :min="parallelsRanges[0].min"
                :max="parallelsRanges[0].max"
                :step="parallelsRanges[0].step"
                unit="°"
                @update:model-value="(value: number) => {
                  handleParameterChange('parallels', [value, parallels[1]])
                }"
              />

              <RangeSlider
                :model-value="parallels[1]"
                :label="t('projectionParams.parallel2')"
                icon="ri-equalizer-line"
                size="xs"
                :min="parallelsRanges[1].min"
                :max="parallelsRanges[1].max"
                :step="parallelsRanges[1].step"
                unit="°"
                @update:model-value="(value: number) => {
                  handleParameterChange('parallels', [parallels[0], value])
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
            <template v-if="hasScaleParameter && scaleMultiplierRange">
              <RangeSlider
                :model-value="effectiveParameters.scaleMultiplier ?? 1.0"
                :label="t('projectionParams.scaleMultiplier')"
                icon="ri-zoom-in-line"
                size="xs"
                :min="scaleMultiplierRange.min"
                :max="scaleMultiplierRange.max"
                :step="scaleMultiplierRange.step"
                unit="×"
                @update:model-value="(value: number) => handleParameterChange('scaleMultiplier', value)"
              />
            </template>

            <template v-if="hasTranslateParameter && isCompositeMode && translateOffsetRanges && pixelClipExtentRanges">
              <RangeSlider
                :model-value="effectiveParameters.translateOffset?.[0] ?? 0"
                label="Translate X"
                icon="ri-arrow-left-right-line"
                size="xs"
                :min="translateOffsetRanges[0].min"
                :max="translateOffsetRanges[0].max"
                :step="translateOffsetRanges[0].step"
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
                :min="translateOffsetRanges[1].min"
                :max="translateOffsetRanges[1].max"
                :step="translateOffsetRanges[1].step"
                unit="px"
                @update:model-value="(value: number) => {
                  const currentTranslateOffset = effectiveParameters.translateOffset ?? [0, 0]
                  handleParameterChange('translateOffset', [currentTranslateOffset[0], value])
                }"
              />

              <RangeSlider
                :model-value="pixelClipExtentArray[0]"
                :label="t('clipExtent.left')"
                icon="ri-arrow-left-line"
                size="xs"
                :min="pixelClipExtentRanges[0].min"
                :max="pixelClipExtentRanges[0].max"
                :step="pixelClipExtentRanges[0].step"
                @update:model-value="(value: number) => updatePixelClipExtent(0, value)"
              />

              <RangeSlider
                :model-value="pixelClipExtentArray[1]"
                :label="t('clipExtent.top')"
                icon="ri-arrow-up-line"
                size="xs"
                :min="pixelClipExtentRanges[1].min"
                :max="pixelClipExtentRanges[1].max"
                :step="pixelClipExtentRanges[1].step"
                @update:model-value="(value: number) => updatePixelClipExtent(1, value)"
              />

              <RangeSlider
                :model-value="pixelClipExtentArray[2]"
                :label="t('clipExtent.right')"
                icon="ri-arrow-right-line"
                size="xs"
                :min="pixelClipExtentRanges[2].min"
                :max="pixelClipExtentRanges[2].max"
                :step="pixelClipExtentRanges[2].step"
                @update:model-value="(value: number) => updatePixelClipExtent(2, value)"
              />

              <RangeSlider
                :model-value="pixelClipExtentArray[3]"
                :label="t('clipExtent.bottom')"
                icon="ri-arrow-down-line"
                size="xs"
                :min="pixelClipExtentRanges[3].min"
                :max="pixelClipExtentRanges[3].max"
                :step="pixelClipExtentRanges[3].step"
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
            <template v-if="hasClipAngleParameter && clipAngleRange">
              <RangeSlider
                :model-value="effectiveParameters.clipAngle ?? parameterRegistry.getDefaultValue('clipAngle')"
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

            <template v-if="hasPrecisionParameter && precisionRange">
              <RangeSlider
                :model-value="effectiveParameters.precision ?? parameterRegistry.getDefaultValue('precision')"
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
