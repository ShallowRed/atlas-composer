import { computed } from 'vue'
import { useTerritoryNames } from '@/composables/useTerritoryNames'
import { useGeoDataStore } from '@/stores/geoData'

export function useTerritoryData() {
  const geoDataStore = useGeoDataStore()
  const { territoryName } = useTerritoryNames()

  const territories = computed(() => geoDataStore.filteredTerritories.map(t => ({ code: t.code, name: territoryName(t.code, t.name) })))

  return { territories }
}
