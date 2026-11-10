<script setup lang="ts">
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TerritoryParameterControls from '@/components/ui/parameters/TerritoryParameterControls.vue'
import AccordionItem from '@/components/ui/primitives/AccordionItem.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()

const {
  territories,
  projectionRecommendations,
  projectionGroups,
  selectedProjection,
  resetTransforms,
  changeTerritoryProjection,
} = useTerritoryTransforms()

const parameterStore = useParameterStore()

const viewStore = useViewStore()

const presetDefaults = usePresetDefaultsStore()

const hasDivergingFromPreset = computed(() => presetDefaults.territoriesDifferFromPreset(
  Object.fromEntries(territories.value.map(({ code }) => [code, parameterStore.getTerritoryParameters(code as TerritoryCode)])),
  viewStore.activeTerritoryCodes,
  viewStore.viewMode === 'composite-custom',
))

const resetToDefaults = resetTransforms

function getTerritoryProjection(territoryCode: TerritoryCode): ProjectionId {
  return parameterStore.getTerritoryProjection(territoryCode) || selectedProjection.value || FALLBACK_PROJECTION_ID
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
  changeTerritoryProjection(territoryCode, newProjectionId as ProjectionId)
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
          :view="viewStore.positioningView"
          :show-inheritance-indicators="true"
        />
      </div>
    </AccordionItem>
  </div>
</template>
