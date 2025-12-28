import { computed } from 'vue'
import { TerritoryDataService } from '@/services/territory/territory-data-service'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

/**
 * Territory Data Composable
 *
 * Single responsibility: Provide read-only access to territory data.
 * Delegates to TerritoryDataService for data aggregation logic.
 *
 * Returns:
 * - territories: List of territories with code and name
 * - translations: Territory translation map
 * - scales: Territory scale multiplier map
 * - projections: Territory projection map
 */
export function useTerritoryData() {
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()

  // Create service instance
  const service = new TerritoryDataService(geoDataStore, parameterStore)

  // Aggregate all data in one computed
  const territoryData = computed(() => service.getTerritoryData())

  return {
    /**
     * List of overseas/secondary territories
     */
    territories: computed(() => territoryData.value.territories),

    /**
     * Territory translations (x, y offsets)
     */
    translations: computed(() => territoryData.value.translations),

    /**
     * Territory scale multipliers
     */
    scales: computed(() => territoryData.value.scales),

    /**
     * Territory projections
     */
    projections: computed(() => territoryData.value.projections),
  }
}
