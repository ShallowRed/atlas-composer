<script setup lang="ts">
import type { ProjectionParameters } from '@/types/projection-parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TerritoryParameterControls from '@/components/ui/parameters/TerritoryParameterControls.vue'
import ViewPresetSelector from '@/components/ui/presets/ViewPresetSelector.vue'
import AccordionItem from '@/components/ui/primitives/AccordionItem.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

const { t } = useI18n()

// Use composable for territory logic
const {
  territories,
  mainlandCode,
  projectionRecommendations,
  projectionGroups,
  currentAtlasConfig,
  selectedProjection,
  shouldShowEmptyState,
  setTerritoryProjection,
} = useTerritoryTransforms()

// GeoData store for accessing cartographer
const geoDataStore = useGeoDataStore()
const parameterStore = useParameterStore()

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
    <!-- View Preset Selector -->
    <ViewPresetSelector />

    <div class="divider" />

    <!-- Message when no territories are available -->
    <Alert
      v-if="shouldShowEmptyState"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>

    <!-- Territory Settings -->
    <div v-if="!shouldShowEmptyState">
      <h3 class="card-title mb-4">
        <i class="ri-shapes-line" />
        {{ t('territory.territorySettings') }}
      </h3>

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
              @update:model-value="(value: string) => setTerritoryProjection(mainlandCode, value)"
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
              @update:model-value="(value: string) => setTerritoryProjection(territory.code, value)"
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
</template>
