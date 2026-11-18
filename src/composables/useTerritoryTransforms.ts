import type { TerritoryCode } from '@/types/branded'
import { computed } from 'vue'
import { useTerritoryCommands } from '@/composables/useTerritoryCommands'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { useTerritoryVisibility } from '@/composables/useTerritoryVisibility'
import { useCompositionStore } from '@/stores/composition'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export function useTerritoryTransforms() {
  const territoryData = useTerritoryData()
  const territoryCommands = useTerritoryCommands()
  const territoryVisibility = useTerritoryVisibility()

  const compositionStore = useCompositionStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()
  const parameterStore = useParameterStore()
  const presetDefaults = usePresetDefaultsStore()

  const projectionRecommendations = computed(() => viewStore.projectionRecommendations)
  const projectionGroups = computed(() => viewStore.projectionGroups)
  const selectedProjection = computed(() => projectionStore.selectedProjection)

  // The territories differ from the reference that the reset restores: the preset, or the proposed composition
  const differsFromReference = computed(() => presetDefaults.territoriesDifferFromPreset(
    Object.fromEntries(territoryData.territories.value.map(({ code }) => [code, parameterStore.getTerritoryParameters(code as TerritoryCode)])),
    viewStore.activeTerritoryCodes,
    viewStore.viewMode === 'composite-custom',
  ))

  return {
    territories: territoryData.territories,

    shouldShowEmptyState: territoryVisibility.shouldShowEmptyState,
    differsFromReference,

    changeTerritoryProjection: territoryCommands.changeTerritoryProjection,

    resetTransforms: compositionStore.resetTransforms,
    resetTerritoryToDefaults: compositionStore.resetTerritoryToDefaults,

    projectionRecommendations,
    projectionGroups,
    selectedProjection,
  }
}
