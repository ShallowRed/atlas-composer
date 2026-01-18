import { computed } from 'vue'
import { useAtlasData } from '@/composables/useAtlasData'
import { TerritoryVisibilityService } from '@/services/territory/territory-visibility-service'
import { useGeoDataStore } from '@/stores/geoData'

export function useTerritoryVisibility() {
  const { currentAtlasConfig } = useAtlasData()
  const geoDataStore = useGeoDataStore()

  const shouldShowEmptyState = computed(() => {
    if (!currentAtlasConfig.value)
      return true

    return TerritoryVisibilityService.shouldShowEmptyState(
      geoDataStore.allActiveTerritories.length,
    )
  })

  return {
    shouldShowEmptyState,
  }
}
