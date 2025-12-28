import { computed } from 'vue'
import { useAtlasData } from '@/composables/useAtlasData'
import { useTerritoryCommands } from '@/composables/useTerritoryCommands'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { useTerritoryReset } from '@/composables/useTerritoryReset'
import { useTerritoryVisibility } from '@/composables/useTerritoryVisibility'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

/**
 * Territory Transforms Composable (Facade)
 *
 * Aggregate composable that combines multiple focused composables.
 * Maintains backward compatibility while delegating to smaller, testable pieces.
 *
 * Composed from:
 * - useTerritoryData: Territory data access (territories, translations, scales, projections)
 * - useTerritoryCommands: Territory mutations (setters)
 * - useTerritoryReset: Reset operations (complex orchestration)
 * - useTerritoryVisibility: Visibility business rules
 *
 * Architecture Benefits:
 * - Each composable has single responsibility
 * - Business logic in testable services
 * - Easy to import only what you need
 * - Clear separation of concerns
 */
export function useTerritoryTransforms() {
  // Delegate to focused composables
  const territoryData = useTerritoryData()
  const territoryCommands = useTerritoryCommands()
  const territoryReset = useTerritoryReset()
  const territoryVisibility = useTerritoryVisibility()

  // Additional data from stores (UI configuration)
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()
  const { currentAtlasConfig } = useAtlasData()

  /**
   * Projection recommendations from view store
   */
  const projectionRecommendations = computed(() => viewStore.projectionRecommendations)

  /**
   * Projection groups from view store
   */
  const projectionGroups = computed(() => viewStore.projectionGroups)

  /**
   * Selected projection from projection store
   */
  const selectedProjection = computed(() => projectionStore.selectedProjection)

  // Aggregate all functionality
  return {
    // Data (from useTerritoryData)
    territories: territoryData.territories,
    translations: territoryData.translations,
    scales: territoryData.scales,
    territoryProjections: territoryData.projections,

    // Visibility (from useTerritoryVisibility)
    showMainland: territoryVisibility.showMainland,
    mainlandCode: territoryVisibility.mainlandCode,
    isMainlandInTerritories: territoryVisibility.isMainlandInTerritories,
    shouldShowEmptyState: territoryVisibility.shouldShowEmptyState,

    // Commands (from useTerritoryCommands)
    setTerritoryTranslation: territoryCommands.setTerritoryTranslation,
    setTerritoryScale: territoryCommands.setTerritoryScale,
    setTerritoryProjection: territoryCommands.setTerritoryProjection,

    // Reset operations (from useTerritoryReset)
    resetTransforms: territoryReset.resetTransforms,
    resetTerritoryToDefaults: territoryReset.resetTerritoryToDefaults,

    // UI configuration (from stores)
    projectionRecommendations,
    projectionGroups,
    currentAtlasConfig,
    selectedProjection,
  }
}
