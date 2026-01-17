<script setup lang="ts">
import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ImportControls from '@/components/ui/import/ImportControls.vue'
import GlobalProjectionControls from '@/components/ui/parameters/GlobalProjectionControls.vue'
import TerritoryParameterControls from '@/components/ui/parameters/TerritoryParameterControls.vue'
import PresetSelector from '@/components/ui/presets/PresetSelector.vue'
import AccordionItem from '@/components/ui/primitives/AccordionItem.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { useViewState } from '@/composables/useViewState'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

const { t } = useI18n()

// Use composable for all territory transform logic
const {
  territories,
  translations,
  scales,
  territoryProjections,
  selectedProjection,
  shouldShowEmptyState,
  resetTransforms,
} = useTerritoryTransforms()

// View state and orchestration
const { isCompositeCustomMode, viewOrchestration } = useViewState()

// Parameter store for checking overrides
const parameterStore = useParameterStore()

// Atlas store for accessing all territories
const atlasStore = useAtlasStore()

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
  // Need to check ALL territories, not just filtered territories
  const allTerritoriesToCheck = atlasStore.atlasService.getAllTerritories() // Use ALL territories, not filteredTerritories

  const allTerritoryParameters: Record<string, Record<string, unknown>> = {}
  // Convert: getAllTerritories() returns territory objects with string codes from JSON
  for (const territory of allTerritoriesToCheck) {
    const territoryParams = parameterStore.getTerritoryParameters(territory.code as TerritoryCode)
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

// Alias for better naming in template
const resetToDefaults = resetTransforms

// Helper function to get projection family for a territory
function getProjectionFamily(territoryCode: TerritoryCode) {
  const projectionId = territoryProjections.value[territoryCode] || selectedProjection.value
  if (!projectionId) {
    return ProjectionFamily.AZIMUTHAL // Fallback
  }
  const definition = projectionRegistry.get(projectionId)
  return definition?.family || ProjectionFamily.AZIMUTHAL // Fallback to azimuthal
}

// Parameter control event handlers
function handleParameterChange(territoryCode: TerritoryCode, _key: keyof ProjectionParameters, _value: unknown) {
  // Notify cartographer to update projection parameters for this territory
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}

function handleOverrideCleared(territoryCode: TerritoryCode, _key: keyof ProjectionParameters) {
  // Notify cartographer to update projection parameters for this territory
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}
</script>

<template>
  <div>
    <!-- Message when no territories are available in selected scope -->
    <Alert
      v-if="shouldShowEmptyState"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>

    <!-- Drag-to-move info for composite-custom mode -->
    <!-- <Alert
      v-if="shouldShowDragInfo"
      type="info"
      class="mb-4"
    >
      {{ t('territory.dragHint') }}
    </Alert> -->

    <div
      v-if="!shouldShowEmptyState || isCompositeCustomMode"
      class="flex flex-col gap-3 mb-8"
    >
      <!-- Preset Selector (shown in composite-custom mode when presets are available) -->
      <PresetSelector v-if="viewOrchestration.shouldShowPresetSelector.value" />

      <!-- Import Controls -->
      <ImportControls v-if="viewOrchestration.shouldShowImportControls.value" />
    </div>
    <!-- Global Projection Controls (shown in composite-custom mode) -->
    <div
      v-if="viewOrchestration.shouldShowGlobalProjectionControls.value"
      class="collapse collapse-arrow border-t rounded-none border-base-300"
    >
      <input type="checkbox">
      <h3 class="collapse-title text-sm font-semibold pl-0">
        <i class="ri-square-line mr-1" />
        {{ t('projectionControls.global.title') }}
      </h3>
      <div class="collapse-content pl-0">
        <GlobalProjectionControls />
      </div>
    </div>
    <div
      v-if="viewOrchestration.shouldShowTerritoryParameterControls.value"
      class="collapse collapse-arrow border-y rounded-none border-base-300"
    >
      <input type="checkbox">
      <h3 class="collapse-title text-sm font-semibold pl-0">
        <i class="ri-shapes-line mr-1" />
        {{ t('territory.territorySettings') }}
      </h3>
      <div class="collapse-content pl-0">
        <!-- All territories reset button -->
        <button
          class="btn btn-sm btn-soft w-full mb-4"
          :disabled="!hasDivergingFromPreset"
          @click="resetToDefaults"
        >
          <i class="ri-restart-line" />
          {{ t('territory.resetButton') }}
        </button>

        <!-- Accordion for all territories (all treated equally) -->
        <div class="join join-vertical w-full">
          <AccordionItem
            v-for="(territory, index) in territories"
            :key="territory.code"
            :title="territory.name"
            :subtitle="territory.code"
            group-name="territory-accordion"
            :checked="index === 0"
          >
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
          </AccordionItem>
        </div>
      </div>
    </div>
  </div>
</template>
