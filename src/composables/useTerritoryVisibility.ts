import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'

export function useTerritoryVisibility() {
  const appStore = useAppStore()
  const atlasStore = useAtlasStore()
  const geoDataStore = useGeoDataStore()

  const shouldShowEmptyState = computed(() => {
    if (appStore.showSkeleton)
      return false
    if (!atlasStore.currentAtlasConfig)
      return true

    return geoDataStore.allActiveTerritories.length === 0
  })

  return {
    shouldShowEmptyState,
  }
}
