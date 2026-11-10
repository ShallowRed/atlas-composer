import { computed } from 'vue'
import { useGeoDataStore } from '@/stores/geoData'

export function useTerritoryData() {
  const geoDataStore = useGeoDataStore()

  const territories = computed(() => geoDataStore.filteredTerritories.map(t => ({ code: t.code, name: t.name })))

  return { territories }
}
