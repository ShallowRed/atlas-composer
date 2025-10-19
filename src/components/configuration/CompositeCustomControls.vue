<script setup lang="ts">
import type { ProjectionParameters } from '@/types/projection-parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ImportControls from '@/components/ui/import/ImportControls.vue'
import GlobalProjectionControls from '@/components/ui/parameters/GlobalProjectionControls.vue'
import TerritoryParameterControls from '@/components/ui/parameters/TerritoryParameterControls.vue'
import PresetSelector from '@/components/ui/presets/PresetSelector.vue'
import AccordionItem from '@/components/ui/primitives/AccordionItem.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

const { t } = useI18n()

// Use composable for all territory transform logic
const {
  territories,
  mainlandCode,
  translations,
  scales,
  projectionRecommendations,
  projectionGroups,
  currentAtlasConfig,
  territoryProjections,
  selectedProjection,
  shouldShowEmptyState,
  setTerritoryProjection,
  resetTransforms,
} = useTerritoryTransforms()

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
    return false
  }

  void parameterStore.territoryParametersVersion

  const allTerritoriesToCheck = configStore.atlasService.getAllTerritories()

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

// Alias for better naming in template
const resetToDefaults = resetTransforms

// Helper function to get current projection for a territory (reactive)
function getTerritoryProjection(territoryCode: string): string {
  return parameterStore.getTerritoryProjection(territoryCode) || selectedProjection.value
}

// Helper function to get projection family for a territory
function getProjectionFamily(territoryCode: string) {
  const projectionId = getTerritoryProjection(territoryCode)
  if (!projectionId) {
    return ProjectionFamily.AZIMUTHAL
  }
  const definition = projectionRegistry.get(projectionId)
  return definition?.family || ProjectionFamily.AZIMUTHAL
}

// Parameter control event handlers
function handleParameterChange(territoryCode: string, _key: keyof ProjectionParameters, _value: unknown) {
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}

function handleOverrideCleared(territoryCode: string, _key: keyof ProjectionParameters) {
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}

// Projection change handler - updates cartographer when projection changes
function handleProjectionChange(territoryCode: string, projectionId: string) {
  // Update parameter store (this triggers watchers)
  setTerritoryProjection(territoryCode, projectionId)

  // Update cartographer's internal composite projection
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryProjection(territoryCode, projectionId)
  }
}

// Check if we should show mainland accordion
const showMainlandAccordion = computed(() => {
  if (!currentAtlasConfig.value) {
    return false
  }
  const hasMainlandConfig = currentAtlasConfig.value.splitModeConfig !== undefined
  const isMainlandInTerritories = territories.value.some(t => t.code === mainlandCode.value)
  return hasMainlandConfig || isMainlandInTerritories
})
</script>

<template>
  <div>
    <!-- Message when no territories are available -->
    <Alert
      v-if="shouldShowEmptyState"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>

    <!-- Preset Selector & Import Controls -->
    <div class="flex flex-col gap-3 mb-8">
      <PresetSelector />
      <ImportControls />
    </div>

    <!-- Global Projection Controls -->
    <div class="collapse collapse-arrow border-t rounded-none border-base-300">
      <input type="checkbox">
      <h3 class="collapse-title text-sm font-semibold pl-0">
        <i class="ri-square-line mr-1" />
        {{ t('projectionControls.global.title') }}
      </h3>
      <div class="collapse-content pl-0">
        <GlobalProjectionControls />
      </div>
    </div>

    <!-- Territory Settings -->
    <div class="collapse collapse-arrow border-y rounded-none border-base-300">
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

        <!-- Accordion for all territories -->
        <div class="join join-vertical w-full">
          <!-- Mainland section -->
          <AccordionItem
            v-if="showMainlandAccordion"
            :title="t(currentAtlasConfig?.splitModeConfig?.mainlandTitle || 'territory.mainland')"
            :subtitle="mainlandCode"
            group-name="territory-accordion"
            :checked="true"
          >
            <!-- Projection Selector -->
            <div class="mb-4">
              <ProjectionDropdown
                :model-value="getTerritoryProjection(mainlandCode)"
                :label="t('projection.cartographic')"
                :projection-groups="projectionGroups"
                :recommendations="projectionRecommendations"
                @update:model-value="(value: string) => handleProjectionChange(mainlandCode, value)"
              />
            </div>

            <!-- Territory Parameter Controls for Mainland -->
            <div class="mb-4">
              <TerritoryParameterControls
                :territory-code="mainlandCode"
                :territory-name="t(currentAtlasConfig?.splitModeConfig?.mainlandTitle || 'territory.mainland')"
                :projection-family="getProjectionFamily(mainlandCode)"
                :show-inheritance-indicators="true"
                :allow-parameter-overrides="true"
                @parameter-changed="handleParameterChange"
                @override-cleared="handleOverrideCleared"
              />
            </div>
          </AccordionItem>

          <!-- Overseas territories -->
          <AccordionItem
            v-for="territory in territories.filter(t => t.code !== mainlandCode)"
            :key="territory.code"
            :title="territory.name"
            :subtitle="territory.code"
            group-name="territory-accordion"
          >
            <!-- Projection Selector -->
            <div class="mb-4">
              <ProjectionDropdown
                :model-value="getTerritoryProjection(territory.code)"
                :label="t('projection.cartographic')"
                :projection-groups="projectionGroups"
                :recommendations="projectionRecommendations"
                @update:model-value="(value: string) => handleProjectionChange(territory.code, value)"
              />
            </div>

            <!-- Territory Parameter Controls -->
            <div class="mb-4">
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
