<script setup lang="ts">
import type { PositioningView, PositionParameter } from '@/core/positioning'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { TerritoryCode } from '@/types/branded'
import type {
  ProjectionParameters,
} from '@/types/projection-parameters'

import { computed, nextTick, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import LatitudeBandSlider from '@/components/ui/forms/LatitudeBandSlider.vue'
import NumberField from '@/components/ui/forms/NumberField.vue'
import ParameterInput from '@/components/ui/forms/ParameterInput.vue'

import ParameterValidationFeedback from '@/components/ui/parameters/ParameterValidationFeedback.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { formatValue, orderedPairLimits, parallelsForBand, parameterRegistry } from '@/core/parameters'
import { getDisplayedCenter, getDisplayedRotate, getPositionParameter, updatePositioningAxis } from '@/core/positioning'
import { useAtlasStore } from '@/stores/atlas'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

interface Props {
  territoryCode: TerritoryCode
  projectionFamily: ProjectionFamilyType
  view: PositioningView
}

const props = defineProps<Props>()

const { t, locale } = useI18n()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()
const parameterStore = useParameterStore()

const isCompositeMode = computed(() => {
  return viewStore.viewMode === 'composite-custom'
})

const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(props.projectionFamily)
})

const controlsOf = (key: keyof ProjectionParameters) => parameterStore.getAxisControls(props.projectionFamily, key)

const rotateControls = computed(() => controlsOf('rotate'))
const centerControls = computed(() => controlsOf('center'))
const parallelsControls = computed(() => controlsOf('parallels'))
const translateOffsetControls = computed(() => controlsOf('translateOffset'))
const pixelClipExtentControls = computed(() => controlsOf('pixelClipExtent'))
const scaleMultiplierControl = computed(() => controlsOf('scaleMultiplier')?.[0])
const clipAngleControl = computed(() => controlsOf('clipAngle')?.[0])
const precisionControl = computed(() => controlsOf('precision')?.[0])

const effectiveParameters = computed(() => {
  return parameterStore.getEffectiveParameters(props.territoryCode)
})

const parallels = computed(() => effectiveParameters.value.parallels ?? parameterRegistry.getDefaultValue('parallels'))

const translateOffset = computed(() => effectiveParameters.value.translateOffset ?? parameterRegistry.getDefaultValue('translateOffset'))

const rotate = computed(() => getDisplayedRotate(effectiveParameters.value, props.view))

const center = computed(() => getDisplayedCenter(effectiveParameters.value))

const validationIssues = computed(() => {
  return parameterStore.validateTerritoryParameters(props.territoryCode, props.projectionFamily)
})

const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]: [string, any]) => constraint.relevant)
    .map(([key]) => key as keyof ProjectionParameters)
})

const pixelClipExtentArray = computed(() => {
  return effectiveParameters.value.pixelClipExtent ?? parameterRegistry.getDefaultValue('pixelClipExtent')
})

const band = computed(() => atlasStore.latitudeBand(props.territoryCode))

const parallelsLimits = computed(() => parallelsControls.value
  ? orderedPairLimits(parallels.value, parallelsControls.value[0]!.format)
  : undefined)

const hasCylindricalParallels = computed(() => parallels.value[0] === -parallels.value[1])

function updateParallel(index: number, value: number) {
  const updated = [...parallels.value] as [number, number]
  updated[index] = value
  handleParameterChange('parallels', updated)
}

const offsetAxes = computed(() => [
  { prefix: 'X', label: t('projectionParams.translateX') },
  { prefix: 'Y', label: t('projectionParams.translateY') },
])

function updateTranslateOffset(index: number, value: number) {
  const updated = [...translateOffset.value] as [number, number]
  updated[index] = value
  handleParameterChange('translateOffset', updated)
}

// Each edge of the frame stops at the opposite edge
const frameEdges = computed(() => {
  const [left, top, right, bottom] = pixelClipExtentArray.value
  return [
    { index: 0, icon: 'ri-arrow-left-line', label: t('clipExtent.left'), limits: { max: right } },
    { index: 1, icon: 'ri-arrow-up-line', label: t('clipExtent.top'), limits: { max: bottom } },
    { index: 2, icon: 'ri-arrow-right-line', label: t('clipExtent.right'), limits: { min: left } },
    { index: 3, icon: 'ri-arrow-down-line', label: t('clipExtent.bottom'), limits: { min: top } },
  ]
})

const frameSize = computed(() => {
  const [left, top, right, bottom] = pixelClipExtentArray.value
  const format = pixelClipExtentControls.value?.[0]?.format ?? { maximumFractionDigits: 2 }
  return `${formatValue(right - left, format, locale.value)} × ${formatValue(bottom - top, format, locale.value)} px`
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

const hasClipAngleParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'clipAngle')
})

const hasPrecisionParameter = computed(() => {
  return relevantParameters.value.some(p => String(p) === 'precision')
})

type GroupId = 'projection' | 'layout' | 'advanced'

const hasProjectionGroup = computed(() => hasPositionParameters.value || hasProjectionSpecificParameters.value)

const hasAdvancedGroup = computed(() => hasClipAngleParameter.value || hasPrecisionParameter.value)

const groupTabs = computed(() => [
  ...(hasProjectionGroup.value ? [{ id: 'projection' as const, label: t('territory.parameters.projectionShort') }] : []),
  { id: 'layout' as const, label: t('territory.parameters.layout') },
  ...(hasAdvancedGroup.value ? [{ id: 'advanced' as const, label: t('territory.parameters.advancedShort') }] : []),
])

const chosenGroup = ref<GroupId>('layout')

const activeGroup = computed(() => groupTabs.value.some(tab => tab.id === chosenGroup.value) ? chosenGroup.value : 'layout')

const tabsId = useId()
const tabButtons = ref<HTMLButtonElement[]>([])

const tabId = (group: GroupId) => `${tabsId}-tab-${group}`
const panelId = (group: GroupId) => `${tabsId}-panel-${group}`

// Keyboard interaction of the WAI-ARIA tabs pattern, with automatic activation
async function moveToTab(event: KeyboardEvent) {
  const tabs = groupTabs.value
  const current = tabs.findIndex(tab => tab.id === activeGroup.value)
  const targets: Record<string, number> = {
    ArrowRight: (current + 1) % tabs.length,
    ArrowLeft: (current - 1 + tabs.length) % tabs.length,
    Home: 0,
    End: tabs.length - 1,
  }
  const target = tabs[targets[event.key] ?? -1]
  if (!target) {
    return
  }
  event.preventDefault()
  chosenGroup.value = target.id
  await nextTick()
  tabButtons.value.find(button => button.id === tabId(chosenGroup.value))?.focus()
}
</script>

<template>
  <div class="territory-parameter-controls">
    <div
      v-if="validationIssues.length > 0"
      class="mb-4"
    >
      <ParameterValidationFeedback :issues="validationIssues" />
    </div>

    <template v-if="relevantParameters.length > 0">
      <div
        role="tablist"
        class="tabs tabs-border tabs-sm mb-4"
      >
        <button
          v-for="tab in groupTabs"
          :id="tabId(tab.id)"
          ref="tabButtons"
          :key="tab.id"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'tab-active': activeGroup === tab.id }"
          :aria-selected="activeGroup === tab.id"
          :aria-controls="panelId(tab.id)"
          :tabindex="activeGroup === tab.id ? 0 : -1"
          @click="chosenGroup = tab.id"
          @keydown="moveToTab"
        >
          {{ tab.label }}
        </button>
      </div>

      <div
        v-if="hasProjectionGroup"
        v-show="activeGroup === 'projection'"
        :id="panelId('projection')"
        role="tabpanel"
        :aria-labelledby="tabId('projection')"
        class="space-y-4"
      >
        <div
          v-if="hasPositionParameters && showRotate && rotateControls"
          class="space-y-1"
        >
          <span class="text-xs font-medium text-base-content/70">{{ t('projectionParams.rotation') }}</span>
          <div class="grid grid-cols-3 gap-2">
            <NumberField
              v-for="(axis, index) in [
                { prefix: 'λ', label: t('projectionParams.rotateLongitude') },
                { prefix: 'φ', label: t('projectionParams.rotateLatitude') },
                { prefix: 'γ', label: t('projectionParams.rotation') },
              ]"
              :key="index"
              :model-value="rotate[index]!"
              :label="axis.label"
              :prefix="axis.prefix"
              scrub
              :control="rotateControls[index]!"
              @update:model-value="(value: number) => handlePositioningChange('rotate', index, value)"
            />
          </div>
        </div>

        <div
          v-if="hasPositionParameters && showCenter && centerControls"
          class="space-y-1"
        >
          <span class="text-xs font-medium text-base-content/70">{{ t('projectionParams.center') }}</span>
          <div class="grid grid-cols-2 gap-2">
            <NumberField
              v-for="(axis, index) in [
                { prefix: 'λ', label: t('projectionParams.centerLongitude') },
                { prefix: 'φ', label: t('projectionParams.centerLatitude') },
              ]"
              :key="index"
              :model-value="center[index]!"
              :label="axis.label"
              :prefix="axis.prefix"
              scrub
              :control="centerControls[index]!"
              @update:model-value="(value: number) => handlePositioningChange('center', index, value)"
            />
          </div>
        </div>

        <div
          v-if="hasProjectionSpecificParameters && parallelsControls && parallelsLimits"
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
          <p
            v-if="hasCylindricalParallels"
            class="text-xs text-warning"
          >
            {{ t('projectionParams.cylindricalParallels') }}
          </p>
        </div>
      </div>

      <div
        v-show="activeGroup === 'layout'"
        :id="panelId('layout')"
        role="tabpanel"
        :aria-labelledby="tabId('layout')"
        class="space-y-4"
      >
        <ParameterInput
          v-if="scaleMultiplierControl"
          :model-value="effectiveParameters.scaleMultiplier ?? parameterRegistry.getDefaultValue('scaleMultiplier')"
          :label="t('projectionParams.scaleMultiplier')"
          :control="scaleMultiplierControl"
          @update:model-value="(value: number) => handleParameterChange('scaleMultiplier', value)"
        />

        <template v-if="isCompositeMode && translateOffsetControls && pixelClipExtentControls">
          <div class="space-y-1">
            <span class="text-xs font-medium text-base-content/70">{{ t('territory.parameters.position') }}</span>
            <div class="grid grid-cols-2 gap-2">
              <NumberField
                v-for="(axis, index) in offsetAxes"
                :key="index"
                :model-value="translateOffset[index]!"
                :label="axis.label"
                :prefix="axis.prefix"
                scrub
                :control="translateOffsetControls[index]!"
                @update:model-value="(value: number) => updateTranslateOffset(index, value)"
              />
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-xs font-medium text-base-content/70">{{ t('projectionParams.frame') }}</span>
              <span class="text-xs tabular-nums text-base-content/60">{{ frameSize }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <NumberField
                v-for="edge in frameEdges"
                :key="edge.index"
                :model-value="pixelClipExtentArray[edge.index]!"
                :label="edge.label"
                :prefix-icon="edge.icon"
                scrub
                :control="pixelClipExtentControls[edge.index]!"
                :limits="edge.limits"
                @update:model-value="(value: number) => updatePixelClipExtent(edge.index, value)"
              />
            </div>
          </div>
        </template>
      </div>

      <div
        v-if="hasAdvancedGroup"
        v-show="activeGroup === 'advanced'"
        :id="panelId('advanced')"
        role="tabpanel"
        :aria-labelledby="tabId('advanced')"
        class="space-y-4"
      >
        <ParameterInput
          v-if="hasClipAngleParameter && clipAngleControl"
          :model-value="effectiveParameters.clipAngle ?? parameterRegistry.getDefaultValue('clipAngle')"
          :label="t('projectionParams.clipAngle')"
          :control="clipAngleControl"
          @update:model-value="(value: number) => handleParameterChange('clipAngle', value)"
        />

        <ParameterInput
          v-if="hasPrecisionParameter && precisionControl"
          :model-value="effectiveParameters.precision ?? parameterRegistry.getDefaultValue('precision')"
          :label="t('projectionParams.precision')"
          :control="precisionControl"
          @update:model-value="(value: number) => handleParameterChange('precision', value)"
        />
      </div>
    </template>

    <Alert
      v-if="relevantParameters.length === 0"
      type="info"
      :title="t('territory.parameters.noRelevantParameters')"
      :message="t('territory.parameters.noRelevantParametersMessage', { family: projectionFamily })"
    />
  </div>
</template>
