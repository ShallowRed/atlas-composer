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
   * Check if there are territories to configure in projection settings
   */
  const hasTerritoriesForProjectionConfig = computed(() => {
    // Has overseas territories
    if (geoDataStore.overseasTerritories.length > 0) {
      return true
    }

    // Or has mainland with single-focus pattern configuration
    const atlasConfig = configStore.currentAtlasConfig
    if (!atlasConfig)
      return false
    const patternService = AtlasPatternService.fromPattern(atlasConfig.pattern)
    return patternService.isSingleFocus() && geoDataStore.mainlandData !== null
  })

  return {
    hasTerritoriesForProjectionConfig,
  }
}
