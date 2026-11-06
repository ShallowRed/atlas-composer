import { computed } from 'vue'
import { useTerritoryCommands } from '@/composables/useTerritoryCommands'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { useTerritoryReset } from '@/composables/useTerritoryReset'
import { useTerritoryVisibility } from '@/composables/useTerritoryVisibility'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export function useTerritoryTransforms() {
  const territoryData = useTerritoryData()
  const territoryCommands = useTerritoryCommands()
  const territoryReset = useTerritoryReset()
  const territoryVisibility = useTerritoryVisibility()

  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()

  const projectionRecommendations = computed(() => viewStore.projectionRecommendations)
  const projectionGroups = computed(() => viewStore.projectionGroups)
  const selectedProjection = computed(() => projectionStore.selectedProjection)

  return {
    territories: territoryData.territories,
    translations: territoryData.translations,
    scales: territoryData.scales,
    territoryProjections: territoryData.projections,

    shouldShowEmptyState: territoryVisibility.shouldShowEmptyState,

    changeTerritoryProjection: territoryCommands.changeTerritoryProjection,

    resetTransforms: territoryReset.resetTransforms,
    resetTerritoryToDefaults: territoryReset.resetTerritoryToDefaults,

    projectionRecommendations,
    projectionGroups,
    selectedProjection,
  }
}
