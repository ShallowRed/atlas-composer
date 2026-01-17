import { computed } from 'vue'
import { useAtlasData } from '@/composables/useAtlasData'
import { TerritoryVisibilityService } from '@/services/territory/territory-visibility-service'
import { useGeoDataStore } from '@/stores/geoData'

/**
 * Territory Visibility Composable
 *
 * Single responsibility: Determine territory visibility based on business rules.
 * Delegates to TerritoryVisibilityService for business logic.
 *
 * Returns:
 * - shouldShowEmptyState: Should show empty state alert (no territories active)
 */
export function useTerritoryVisibility() {
  const { currentAtlasConfig } = useAtlasData()
  const geoDataStore = useGeoDataStore()

  /**
   * Should show empty state alert in TerritoryControls
   * Shows when no territories active
   */
  const shouldShowEmptyState = computed(() => {
    if (!currentAtlasConfig.value)
      return true // Show empty state if no atlas loaded

    return TerritoryVisibilityService.shouldShowEmptyState(
      geoDataStore.allActiveTerritories.length,
    )
  })

  return {
    shouldShowEmptyState,
  }
}
