<script setup lang="ts">
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import TerritoryParameterControls from '@/components/ui/parameters/TerritoryParameterControls.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
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
  resetTerritoryToDefaults,
  changeTerritoryProjection,
} = useTerritoryTransforms()

const { selectedTerritory, selectTerritory, clearSelection } = useSelectedTerritory()

const parameterStore = useParameterStore()

const viewStore = useViewStore()

const presetDefaults = usePresetDefaultsStore()

const backButton = ref<HTMLButtonElement>()
const rowButtons = ref<HTMLButtonElement[]>([])

const hasDivergingFromPreset = computed(() => presetDefaults.territoriesDifferFromPreset(
  Object.fromEntries(territories.value.map(({ code }) => [code, parameterStore.getTerritoryParameters(code as TerritoryCode)])),
  viewStore.activeTerritoryCodes,
  viewStore.viewMode === 'composite-custom',
))

const selectedTerritoryDiffers = computed(() => {
  const territory = selectedTerritory.value
  return territory !== null && presetDefaults.territoryDiffersFromPreset(territory.code, parameterStore.getTerritoryParameters(territory.code))
})

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

function getProjectionLabel(territoryCode: TerritoryCode) {
  const projectionId = getTerritoryProjection(territoryCode)
  return t(projectionRegistry.get(projectionId)?.name ?? projectionId)
}

function changeSelectedTerritoryProjection(projectionId: ProjectionId) {
  if (selectedTerritory.value) {
    changeTerritoryProjection(selectedTerritory.value.code, projectionId)
  }
}

async function openTerritory(territoryCode: TerritoryCode) {
  selectTerritory(territoryCode)
  await nextTick()
  backButton.value?.focus()
}

async function closeTerritory() {
  const territoryCode = selectedTerritory.value?.code
  clearSelection()
  await nextTick()
  rowButtons.value.find(button => button.dataset.territory === territoryCode)?.focus()
}

watch(selectedTerritory, (territory) => {
  if (territory === null) {
    clearSelection()
  }
})

onUnmounted(clearSelection)
</script>

<template>
  <template v-if="selectedTerritory === null">
    <div class="flex items-center justify-between gap-2 mb-2">
      <h3 class="text-sm font-semibold flex items-center gap-2">
        <i class="ri-shapes-line" />
        {{ t('territory.territories') }}
      </h3>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        :disabled="!hasDivergingFromPreset"
        @click="resetTransforms"
      >
        <i class="ri-restart-line" />
        {{ t('territory.reset') }}
      </button>
    </div>
    <ul class="menu w-full p-0">
      <li
        v-for="territory in territories"
        :key="territory.code"
      >
        <button
          ref="rowButtons"
          type="button"
          class="flex items-center gap-3 px-2 text-left whitespace-normal"
          :data-territory="territory.code"
          @click="openTerritory(territory.code)"
        >
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium">{{ territory.name }}</span>
            <span class="block text-xs opacity-70">{{ getProjectionLabel(territory.code) }}</span>
          </span>
          <span class="badge badge-sm badge-ghost">{{ territory.code }}</span>
          <i class="ri-arrow-right-s-line text-lg opacity-70" />
        </button>
      </li>
    </ul>
  </template>

  <template v-else>
    <button
      ref="backButton"
      type="button"
      class="btn btn-ghost btn-sm -ml-2 px-2 mb-2"
      @click="closeTerritory"
    >
      <i class="ri-arrow-left-s-line text-lg" />
      {{ t('territory.territories') }}
    </button>
    <div class="flex items-center justify-between gap-2 mb-4">
      <h3 class="text-base font-semibold flex items-center gap-2 min-w-0">
        <span class="min-w-0">{{ selectedTerritory.name }}</span>
        <span class="badge badge-sm badge-ghost shrink-0">{{ selectedTerritory.code }}</span>
      </h3>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square"
        :title="t('territory.resetOne')"
        :aria-label="t('territory.resetOne')"
        :disabled="!selectedTerritoryDiffers"
        @click="resetTerritoryToDefaults(selectedTerritory.code)"
      >
        <i class="ri-restart-line text-base" />
      </button>
    </div>

    <div class="mb-6">
      <ProjectionDropdown
        :model-value="getTerritoryProjection(selectedTerritory.code)"
        :label="t('projection.cartographic')"
        :projection-groups="projectionGroups"
        :recommendations="projectionRecommendations"
        @update:model-value="changeSelectedTerritoryProjection"
      />
    </div>

    <TerritoryParameterControls
      :territory-code="selectedTerritory.code"
      :projection-family="getProjectionFamily(selectedTerritory.code)"
      :view="viewStore.positioningView"
    />
  </template>
</template>
