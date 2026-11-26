import type { TerritoryCode } from '@/types'
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

  // The territories or their parameters differ from the reference: the preset, the imported file or the proposal
  const differsFromReference = computed(() => presetDefaults.territoriesDifferFromPreset(
    Object.fromEntries(territoryData.territories.value.map(({ code }) => [code, parameterStore.getTerritoryParameters(code as TerritoryCode)])),
    viewStore.activeTerritoryCodes,
    viewStore.viewMode === 'composite-custom',
  ))

  const projectionRecommendations = computed(() => viewStore.projectionRecommendations)
  const projectionGroups = computed(() => viewStore.projectionGroups)
  const selectedProjection = computed(() => projectionStore.selectedProjection)

  return {
    territories: territoryData.territories,

    shouldShowEmptyState: territoryVisibility.shouldShowEmptyState,

    changeTerritoryProjection: territoryCommands.changeTerritoryProjection,

    differsFromReference,
    resetTransforms: compositionStore.resetTransforms,
    resetTerritoryToDefaults: compositionStore.resetTerritoryToDefaults,

    projectionRecommendations,
    projectionGroups,
    selectedProjection,
  }
}
