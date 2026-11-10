import { computed } from 'vue'
import { useTerritoryCommands } from '@/composables/useTerritoryCommands'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { useTerritoryVisibility } from '@/composables/useTerritoryVisibility'
import { useCompositionStore } from '@/stores/composition'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export function useTerritoryTransforms() {
  const territoryData = useTerritoryData()
  const territoryCommands = useTerritoryCommands()
  const territoryVisibility = useTerritoryVisibility()

  const compositionStore = useCompositionStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()

  const projectionRecommendations = computed(() => viewStore.projectionRecommendations)
  const projectionGroups = computed(() => viewStore.projectionGroups)
  const selectedProjection = computed(() => projectionStore.selectedProjection)

  return {
    territories: territoryData.territories,

    shouldShowEmptyState: territoryVisibility.shouldShowEmptyState,

    changeTerritoryProjection: territoryCommands.changeTerritoryProjection,

    resetTransforms: compositionStore.resetTransforms,
    resetTerritoryToDefaults: compositionStore.resetTerritoryToDefaults,

    projectionRecommendations,
    projectionGroups,
    selectedProjection,
  }
}
