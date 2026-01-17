import { computed } from 'vue'
import { useAtlasData } from '@/composables/useAtlasData'
import { TerritoryVisibilityService } from '@/services/territory/territory-visibility-service'
import { useGeoDataStore } from '@/stores/geoData'
import { createTerritoryCode } from '@/types/branded'

/**
 * Territory Visibility Composable
 *
 * Single responsibility: Determine territory visibility based on business rules.
 * Delegates to TerritoryVisibilityService for business logic.
 *
 * Returns:
 * - showMainland: Should show mainland section
 * - mainlandCode: Code of the mainland territory
 * - isMainlandInTerritories: Is mainland in active territories list
 * - shouldShowEmptyState: Should show empty state alert
 */
export function useTerritoryVisibility() {
  const { currentAtlasConfig } = useAtlasData()
  const geoDataStore = useGeoDataStore()

  /**
   * Should show mainland section (only for single-focus pattern)
   */
  const showMainland = computed(() => {
    const atlasConfig = currentAtlasConfig.value
    if (!atlasConfig)
      return false
    return TerritoryVisibilityService.shouldShowMainland(atlasConfig.pattern)
  })

  /**
   * Get mainland code from atlas config
   * Convert: Config JSON has string, app expects TerritoryCode
   */
  const mainlandCode = computed(() => {
    const code = currentAtlasConfig.value?.splitModeConfig?.mainlandCode || 'MAINLAND'
    return createTerritoryCode(code)
  })

  /**
   * Check if mainland is in active territories list
   */
  const isMainlandInTerritories = computed(() => {
    return geoDataStore.allActiveTerritories.some(t => t.code === mainlandCode.value)
  })

  /**
   * Should show empty state alert in TerritoryControls
   * Shows when no territories AND no mainland visible
   */
  const shouldShowEmptyState = computed(() => {
    const atlasConfig = currentAtlasConfig.value
    if (!atlasConfig)
      return true // Show empty state if no atlas loaded

    return TerritoryVisibilityService.shouldShowEmptyState({
      territoryCount: geoDataStore.filteredTerritories.length,
      hasMainlandInActiveTerritories: isMainlandInTerritories.value,
    })
  })

  return {
    showMainland,
    mainlandCode,
    isMainlandInTerritories,
    shouldShowEmptyState,
  }
}
