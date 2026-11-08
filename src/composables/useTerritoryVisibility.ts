import { computed } from 'vue'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'

export function useTerritoryVisibility() {
  const atlasStore = useAtlasStore()
  const geoDataStore = useGeoDataStore()

  const shouldShowEmptyState = computed(() => {
    if (!atlasStore.currentAtlasConfig)
      return true

    return geoDataStore.allActiveTerritories.length === 0
  })

  return {
    shouldShowEmptyState,
  }
}
