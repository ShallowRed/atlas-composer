import { computed } from 'vue'
import { useAtlasData } from '@/composables/useAtlasData'
import { useGeoDataStore } from '@/stores/geoData'

export function useTerritoryVisibility() {
  const { currentAtlasConfig } = useAtlasData()
  const geoDataStore = useGeoDataStore()

  const shouldShowEmptyState = computed(() => {
    if (!currentAtlasConfig.value)
      return true

    return geoDataStore.allActiveTerritories.length === 0
  })

  return {
    shouldShowEmptyState,
  }
}
