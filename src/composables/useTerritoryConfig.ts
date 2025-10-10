import { computed } from 'vue'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

/**
 * Manages territory configuration and provides territory-related utilities
 */
export function useTerritoryConfig() {
  const configStore = useConfigStore()
  const geoDataStore = useGeoDataStore()

  /**
   * Check if there are territories to configure (including mainland)
   */
  const hasTerritoriesForProjectionConfig = computed(() => {
    // Has territories
    if (geoDataStore.filteredTerritories.length > 0) {
      return true
    }

    // Or has mainland with single-focus pattern configuration
    const patternService = AtlasPatternService.fromPattern(configStore.currentAtlasConfig.pattern)
    return patternService.isSingleFocus() && geoDataStore.mainlandData !== null
  })

  return {
    hasTerritoriesForProjectionConfig,
  }
}
