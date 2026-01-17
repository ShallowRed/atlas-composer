<script setup lang="ts">
import type { ProjectionId, TerritoryCode } from '@/types/branded'
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
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()

// Use composable for territory logic
const {
  translations,
  scales,
  territoryProjections,
  territories,
  projectionRecommendations,
  projectionGroups,
  selectedProjection,
  resetTransforms,
  setTerritoryProjection,
} = useTerritoryTransforms()
// Use composable for all territory transform logic

// GeoData store for accessing cartographer
const geoDataStore = useGeoDataStore()

// Parameter store for checking overrides
const parameterStore = useParameterStore()

// Atlas store for accessing all territories
const atlasStore = useAtlasStore()

// View store for view mode and active territories
const viewStore = useViewStore()

// Preset defaults for checking divergence
const presetDefaults = getSharedPresetDefaults()

// Check if there are any parameters that differ from preset defaults
const hasDivergingFromPreset = computed(() => {
  if (!presetDefaults.hasPresetDefaults()) {
    return false
  }

  void parameterStore.territoryParametersVersion

  // Check if territory set has changed (for custom composite mode)
  if (viewStore.viewMode === 'composite-custom') {
    const presetDefaults_ = presetDefaults.presetDefaults.value
    if (presetDefaults_) {
      // Convert: Object.keys returns string[], need to convert for comparison
      const presetTerritoryCodes = new Set(Object.keys(presetDefaults_.projections))
      const activeTerritoryCodes = viewStore.activeTerritoryCodes

      // Check if sets are different
      if (presetTerritoryCodes.size !== activeTerritoryCodes.size) {
        return true
      }
      for (const code of presetTerritoryCodes) {
        if (!activeTerritoryCodes.has(code as TerritoryCode)) {
          return true
        }
      }
    }
  }

  const allTerritoriesToCheck = atlasStore.atlasService.getAllTerritories()

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

// Helper function to get current projection for a territory (reactive)
function getTerritoryProjection(territoryCode: TerritoryCode): ProjectionId {
  return parameterStore.getTerritoryProjection(territoryCode) || selectedProjection.value || 'mercator' as ProjectionId
}

// Helper function to get projection family for a territory
function getProjectionFamily(territoryCode: TerritoryCode) {
  const projectionId = getTerritoryProjection(territoryCode)
  if (!projectionId) {
    return ProjectionFamily.AZIMUTHAL
  }
  const definition = projectionRegistry.get(projectionId)
  return definition?.family || ProjectionFamily.AZIMUTHAL
}

// Handler for projection dropdown changes
function handleProjectionChange(territoryCode: TerritoryCode, projectionId: ProjectionId) {
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
function handleParameterChange(territoryCode: TerritoryCode, _key: keyof ProjectionParameters, _value: unknown) {
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}

function handleOverrideCleared(territoryCode: TerritoryCode, _key: keyof ProjectionParameters) {
  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}
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

  <!-- Accordion for all territories (treated equally) -->
  <div class="join join-vertical w-full">
    <AccordionItem
      v-for="(territory, index) in territories"
      :key="territory.code"
      :title="territory.name"
      :subtitle="territory.code"
      group-name="territory-accordion"
      :checked="index === 0"
    >
      <!-- Projection Selector -->
      <div class="mb-4">
        <ProjectionDropdown
          :model-value="getTerritoryProjection(territory.code)"
          :label="t('projection.cartographic')"
          :projection-groups="projectionGroups"
          :recommendations="projectionRecommendations"
          @update:model-value="(value: ProjectionId) => handleProjectionChange(territory.code, value)"
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
