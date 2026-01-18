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

const geoDataStore = useGeoDataStore()

const parameterStore = useParameterStore()

const atlasStore = useAtlasStore()

const viewStore = useViewStore()

const presetDefaults = getSharedPresetDefaults()

const hasDivergingFromPreset = computed(() => {
  if (!presetDefaults.hasPresetDefaults()) {
    return false
  }

  void parameterStore.territoryParametersVersion

  if (viewStore.viewMode === 'composite-custom') {
    const presetDefaults_ = presetDefaults.presetDefaults.value
    if (presetDefaults_) {
      const presetTerritoryCodes = new Set(Object.keys(presetDefaults_.projections))
      const activeTerritoryCodes = viewStore.activeTerritoryCodes

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

const resetToDefaults = resetTransforms

function getTerritoryProjection(territoryCode: TerritoryCode): ProjectionId {
  return parameterStore.getTerritoryProjection(territoryCode) || selectedProjection.value || 'mercator' as ProjectionId
}

function getProjectionFamily(territoryCode: TerritoryCode) {
  const projectionId = getTerritoryProjection(territoryCode)
  if (!projectionId) {
    return ProjectionFamily.AZIMUTHAL
  }
  const definition = projectionRegistry.get(projectionId)
  return definition?.family || ProjectionFamily.AZIMUTHAL
}

function handleProjectionChange(territoryCode: TerritoryCode, newProjectionId: string) {
  setTerritoryProjection(territoryCode, newProjectionId as ProjectionId)

  if (geoDataStore.cartographer) {
    geoDataStore.cartographer.updateTerritoryProjection(territoryCode, newProjectionId as ProjectionId)
    geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  }
}

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
