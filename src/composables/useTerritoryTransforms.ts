import { computed } from 'vue'
import { useAtlasData } from '@/composables/useAtlasData'
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
  const { currentAtlasConfig } = useAtlasData()

  const projectionRecommendations = computed(() => viewStore.projectionRecommendations)
  const projectionGroups = computed(() => viewStore.projectionGroups)
  const selectedProjection = computed(() => projectionStore.selectedProjection)

  return {
    territories: territoryData.territories,
    translations: territoryData.translations,
    scales: territoryData.scales,
    territoryProjections: territoryData.projections,

    shouldShowEmptyState: territoryVisibility.shouldShowEmptyState,

    setTerritoryTranslation: territoryCommands.setTerritoryTranslation,
    setTerritoryScale: territoryCommands.setTerritoryScale,
    setTerritoryProjection: territoryCommands.setTerritoryProjection,

    resetTransforms: territoryReset.resetTransforms,
    resetTerritoryToDefaults: territoryReset.resetTerritoryToDefaults,

    projectionRecommendations,
    projectionGroups,
    currentAtlasConfig,
    selectedProjection,
  }
}
