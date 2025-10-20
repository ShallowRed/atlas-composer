<script setup lang="ts">
import type { ProjectionParameters } from '@/types/projection-parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TerritoryParameterControls from '@/components/ui/parameters/TerritoryParameterControls.vue'
import AccordionItem from '@/components/ui/primitives/AccordionItem.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

const { t } = useI18n()

// Use composable for territory logic
const {
  translations,
  scales,
  territoryProjections,
  territories,
  mainlandCode,
  projectionRecommendations,
  projectionGroups,
  currentAtlasConfig,
  selectedProjection,
  resetTransforms,
  setTerritoryProjection,
} = useTerritoryTransforms()
// Use composable for all territory transform logic

// GeoData store for accessing cartographer
const geoDataStore = useGeoDataStore()

// Parameter store for checking overrides
const parameterStore = useParameterStore()

// Config store for accessing all territories
const configStore = useConfigStore()

// Preset defaults for checking divergence
const presetDefaults = getSharedPresetDefaults()

// Check if there are any parameters that differ from preset defaults
const hasDivergingFromPreset = computed(() => {
  if (!presetDefaults.hasPresetDefaults()) {
    return false
  }

  void parameterStore.territoryParametersVersion

  // Check if territory set has changed (for custom composite mode)
  if (configStore.viewMode === 'composite-custom') {
    const presetDefaults_ = presetDefaults.presetDefaults.value
    if (presetDefaults_) {
      const presetTerritoryCodes = new Set(Object.keys(presetDefaults_.projections))
      const activeTerritoryCodes = configStore.activeTerritoryCodes

      // Check if sets are different
      if (presetTerritoryCodes.size !== activeTerritoryCodes.size) {
        return true
      }
      for (const code of presetTerritoryCodes) {
        if (!activeTerritoryCodes.has(code)) {
          return true
        }
      }
    }
  }

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
  return parameterStore.getTerritoryProjection(territoryCode) || selectedProjection.value || 'mercator'
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

// Handler for projection dropdown changes
function handleProjectionChange(territoryCode: string, projectionId: string) {
  // Update parameter store
  setTerritoryProjection(territoryCode, projectionId)

  // Update cartographer to recreate the D3 projection object
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryProjection(territoryCode, projectionId)
    // Also update parameters to apply them to the new projection
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
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
</template>
