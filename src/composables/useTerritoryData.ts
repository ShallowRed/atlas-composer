import { computed } from 'vue'
import { TerritoryDataService } from '@/services/territory/territory-data-service'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

export function useTerritoryData() {
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()

  const service = new TerritoryDataService(geoDataStore, parameterStore)

  const territoryData = computed(() => service.getTerritoryData())

  return {
    territories: computed(() => territoryData.value.territories),
    translations: computed(() => territoryData.value.translations),
    scales: computed(() => territoryData.value.scales),
    projections: computed(() => territoryData.value.projections),
  }
}
