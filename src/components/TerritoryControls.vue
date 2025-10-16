<script setup lang="ts">
import type { ProjectionParameters } from '@/types/projection-parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ImportControls from '@/components/ui/import/ImportControls.vue'
import GlobalProjectionControls from '@/components/ui/parameters/GlobalProjectionControls.vue'
import TerritoryParameterControls from '@/components/ui/parameters/TerritoryParameterControls.vue'
import PresetSelector from '@/components/ui/presets/PresetSelector.vue'
import AccordionItem from '@/components/ui/primitives/AccordionItem.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { useViewState } from '@/composables/useViewState'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

const props = withDefaults(defineProps<Props>(), {
  showTransformControls: true,
})

const { t } = useI18n()

interface Props {
  showTransformControls?: boolean // Show translation/scale controls (false for split mode)
}
// Use composable for all territory transform logic
const {
  territories,
  showMainland,
  mainlandCode,
  isMainlandInTerritories,
  translations,
  scales,
  translationRanges: TRANSLATION_RANGES,
  scaleRange: SCALE_RANGE,
  projectionRecommendations,
  projectionGroups,
  currentAtlasConfig,
  territoryProjections,
  selectedProjection,
  projectionMode,
  shouldShowEmptyState,
  setTerritoryTranslation,
  setTerritoryScale,
  setTerritoryProjection,
  resetTransforms,
} = useTerritoryTransforms()

// Check if presets are available for current atlas
const hasPresets = computed(() => {
  return (currentAtlasConfig.value.availablePresets?.length ?? 0) > 0
})

// View state for drag info display
const { isCompositeCustomMode } = useViewState()

// Parameter store for checking overrides
const parameterStore = useParameterStore()

// Config store for accessing all territories
const configStore = useConfigStore()

// GeoData store for accessing cartographer
const geoDataStore = useGeoDataStore()

// Preset defaults for checking divergence
const presetDefaults = getSharedPresetDefaults()

// Check if there are any parameters that differ from preset defaults
const hasDivergingFromPreset = computed(() => {
  if (!presetDefaults.hasPresetDefaults()) {
    return false // No preset loaded, consider no divergence
  }

  // Force reactivity on parameter changes
  void parameterStore.territoryParametersVersion

  // Get all territory parameter overrides
  // Need to check ALL territories including mainland, not just filtered territories
  const allTerritoriesToCheck = configStore.atlasService.getAllTerritories() // Use ALL territories, not filteredTerritories

  const allTerritoryParameters: Record<string, Record<string, unknown>> = {}
  for (const territory of allTerritoriesToCheck) {
    const territoryParams = parameterStore.getTerritoryParameters(territory.code)
    if (Object.keys(territoryParams).length > 0) {
      allTerritoryParameters[territory.code] = territoryParams
    }
  }

  const result = presetDefaults.hasDivergingParameters(
    translations.value,
    scales.value,
    allTerritoryParameters,
    territoryProjections.value,
  )

  return result
})

// Show drag info when in composite-custom mode and have overseas territories
const shouldShowDragInfo = computed(() => {
  return isCompositeCustomMode.value && territories.value.length > 0 && !shouldShowEmptyState.value
})

// Event handlers that call composable functions directly
function updateTranslationX(territoryCode: string, value: number) {
  setTerritoryTranslation(territoryCode, 'x', value)
}

function updateTranslationY(territoryCode: string, value: number) {
  setTerritoryTranslation(territoryCode, 'y', value)
}

function updateScale(territoryCode: string, value: number) {
  setTerritoryScale(territoryCode, value)

  // Notify cartographer to update projection parameters for this territory
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}

// Alias for better naming in template
const resetToDefaults = resetTransforms

// Helper function to get projection family for a territory
function getProjectionFamily(territoryCode: string) {
  const projectionId = territoryProjections.value[territoryCode] || selectedProjection.value
  if (!projectionId) {
    return ProjectionFamily.AZIMUTHAL // Fallback
  }
  const definition = projectionRegistry.get(projectionId)
  return definition?.family || ProjectionFamily.AZIMUTHAL // Fallback to azimuthal
}

// Parameter control event handlers
function handleParameterChange(territoryCode: string, _key: keyof ProjectionParameters, _value: unknown) {
  // Notify cartographer to update projection parameters for this territory
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}

function handleOverrideCleared(territoryCode: string, _key: keyof ProjectionParameters) {
  // Notify cartographer to update projection parameters for this territory
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}
</script>

<template>
  <div>
    <!-- Message when no territories are available (and no mainland in individual mode) -->
    <Alert
      v-if="shouldShowEmptyState"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>

    <!-- Drag-to-move info for composite-custom mode -->
    <Alert
      v-if="shouldShowDragInfo"
      type="info"
      class="mb-4"
    >
      {{ t('territory.dragHint') }}
    </Alert>

    <div
      v-if="!shouldShowEmptyState || isCompositeCustomMode"
      class="flex flex-col gap-3 mb-8"
    >
      <!-- Global Projection Controls (shown in composite-custom mode) -->
      <GlobalProjectionControls v-if="isCompositeCustomMode" />

      <!-- Divider between global and preset/import controls -->
      <div
        v-if="isCompositeCustomMode"
        class="divider my-2"
      />

      <!-- Preset Selector (shown in composite-custom mode when presets are available) -->
      <PresetSelector v-if="hasPresets && isCompositeCustomMode" />

      <ImportControls />
      <button
        class="btn btn-sm btn-soft"
        :disabled="!hasDivergingFromPreset"
        @click="resetToDefaults"
      >
        <i class="ri-restart-line" />
        {{ t('territory.resetButton') }}
      </button>
    </div>
    <div class="mb-4">
      <!-- Accordion for all territories -->
      <div class="join join-vertical w-full">
        <!-- Mainland section (shown when has mainland config OR when mainland is in territories list) -->
        <AccordionItem
          v-if="projectionMode === 'individual' && (showMainland || isMainlandInTerritories)"
          :title="t(currentAtlasConfig.splitModeConfig?.mainlandTitle || 'territory.mainland')"
          :subtitle="mainlandCode"
          group-name="territory-accordion"
          :checked="true"
        >
          <!-- Projection Selector -->
          <div class="mb-4">
            <ProjectionDropdown
              :model-value="territoryProjections[mainlandCode] || selectedProjection"
              :label="t('projection.cartographic')"
              :projection-groups="projectionGroups"
              :recommendations="projectionRecommendations"
              @update:model-value="(value: string) => setTerritoryProjection(mainlandCode, value)"
            />
          </div>

          <!-- Territory Parameter Controls for Mainland (shown in composite-custom mode) -->
          <div
            v-if="isCompositeCustomMode"
            class="mb-4"
          >
            <TerritoryParameterControls
              :territory-code="mainlandCode"
              :territory-name="t(currentAtlasConfig.splitModeConfig?.mainlandTitle || 'territory.mainland')"
              :projection-family="getProjectionFamily(mainlandCode)"
              :show-inheritance-indicators="true"
              :allow-parameter-overrides="true"
              @parameter-changed="handleParameterChange"
              @override-cleared="handleOverrideCleared"
            />
          </div>
        </AccordionItem>

        <!-- Overseas territories (excluding mainland to avoid duplication) -->
        <AccordionItem
          v-for="(territory, index) in territories.filter(t => t.code !== mainlandCode)"
          :key="territory.code"
          :title="territory.name"
          :subtitle="territory.code"
          group-name="territory-accordion"
          :checked="projectionMode === 'uniform' && index === 0"
        >
          <!-- Projection Selector (always shown in individual mode) -->
          <div
            v-if="projectionMode === 'individual'"
            class="mb-4"
          >
            <ProjectionDropdown
              :model-value="territoryProjections[territory.code] || selectedProjection"
              :label="t('projection.cartographic')"
              :projection-groups="projectionGroups"
              :recommendations="projectionRecommendations"
              @update:model-value="(value: string) => setTerritoryProjection(territory.code, value)"
            />
          </div>

          <!-- Territory Parameter Controls (shown in composite-custom mode) -->
          <div
            v-if="isCompositeCustomMode"
            class="mb-4"
          >
            <TerritoryParameterControls
              :territory-code="territory.code"
              :territory-name="territory.name"
              :projection-family="getProjectionFamily(territory.code)"
              :show-inheritance-indicators="true"
              :allow-parameter-overrides="true"
              @parameter-changed="handleParameterChange"
              @override-cleared="handleOverrideCleared"
            />
          </div>

          <!-- Transform Controls (hidden in split mode) -->
          <template v-if="props.showTransformControls">
            <!-- X Translation (in pixels relative to mainland center) -->
            <div class="mb-4">
              <RangeSlider
                :model-value="translations[territory.code]?.x || 0"
                :label="t('territory.positionX')"
                icon="ri-arrow-left-right-line"
                :min="TRANSLATION_RANGES.x.min"
                :max="TRANSLATION_RANGES.x.max"
                :step="TRANSLATION_RANGES.x.step"
                unit="px"
                @update:model-value="(value) => updateTranslationX(territory.code, value)"
              />
            </div>

            <!-- Y Translation (in pixels relative to mainland center) -->
            <div class="mb-4">
              <RangeSlider
                :model-value="translations[territory.code]?.y || 0"
                :label="t('territory.positionY')"
                icon="ri-arrow-up-down-line"
                :min="TRANSLATION_RANGES.y.min"
                :max="TRANSLATION_RANGES.y.max"
                :step="TRANSLATION_RANGES.y.step"
                unit="px"
                color="secondary"
                @update:model-value="(value) => updateTranslationY(territory.code, value)"
              />
            </div>

            <!-- Scale -->
            <div class="mb-2">
              <RangeSlider
                :model-value="scales[territory.code] || SCALE_RANGE.default"
                :label="t('territory.scale')"
                icon="ri-expand-diagonal-line"
                :min="SCALE_RANGE.min"
                :max="SCALE_RANGE.max"
                :step="SCALE_RANGE.step"
                unit="×"
                color="accent"
                :decimals="2"
                @update:model-value="(value) => updateScale(territory.code, value)"
              />
            </div>
          </template>
        </AccordionItem>
      </div>
    </div>
  </div>
</template>
