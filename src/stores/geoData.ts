import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { Cartographer } from '@/services/cartographer-service'
import { TerritoryDataLoader } from '@/services/data/territory-data-loader'
import { TerritoryFilterService } from '@/services/data/territory-filter-service'
import { useConfigStore } from '@/stores/config'

export interface Territory {
  name: string
  code: string
  area: number
  region: string
  data: GeoJSON.FeatureCollection
}

export const useGeoDataStore = defineStore('geoData', () => {
  // Services
  const cartographer = ref<Cartographer | null>(null)

  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  // Territory data
  const mainlandData = ref<GeoJSON.FeatureCollection | null>(null)
  const overseasTerritoriesData = ref<Territory[]>([])
  const rawUnifiedData = ref<GeoJSON.FeatureCollection | null>(null)

  // Computed
  const filteredTerritories = computed(() => {
    const configStore = useConfigStore()
    const territories = overseasTerritoriesData.value

    if (!territories || territories.length === 0) {
      return []
    }

    const atlasConfig = configStore.currentAtlasConfig
    const atlasService = configStore.atlasService

    // Use TerritoryFilterService to filter territories
    return TerritoryFilterService.filterTerritories(territories, {
      hasTerritorySelector: atlasConfig.hasTerritorySelector ?? false,
      territoryMode: configStore.territoryMode,
      allTerritories: atlasService.getAllTerritories(),
      territoryModes: atlasService.getTerritoryModes() as any,
    })
  })

  const territoryGroups = computed(() => {
    // Use TerritoryFilterService to group territories
    return TerritoryFilterService.groupByRegion(filteredTerritories.value)
  })

  // Actions
  const initialize = async () => {
    if (isInitialized.value)
      return

    const configStore = useConfigStore()

    try {
      isLoading.value = true
      error.value = null

      // Use the geo data config from the selected region
      const geoDataConfig = configStore.currentAtlasConfig.geoDataConfig
      const compositeConfig = configStore.currentAtlasConfig.compositeProjectionConfig
      const projectionParams = configStore.atlasService?.getProjectionParams()
      cartographer.value = new Cartographer(geoDataConfig, compositeConfig, projectionParams)
      await cartographer.value.init()

      isInitialized.value = true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error initializing geo data'
      console.error('Geo data store initialization error:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  const loadTerritoryData = async () => {
    if (!cartographer.value) {
      await initialize()
    }

    const configStore = useConfigStore()

    try {
      isLoading.value = true
      error.value = null

      // Access the geoDataService through the cartographer's public API
      if (!cartographer.value) {
        throw new Error('Cartographer not initialized')
      }
      const service = cartographer.value.geoData

      // Use TerritoryDataLoader with strategy pattern to load data
      const loader = TerritoryDataLoader.fromPattern(configStore.currentAtlasConfig.pattern)
      const result = await loader.loadTerritories(service)

      mainlandData.value = result.mainlandData
      overseasTerritoriesData.value = result.territories
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error loading territory data'
      console.error('Error loading territory data:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  const loadRawUnifiedData = async (mode: string) => {
    if (!cartographer.value) {
      await initialize()
    }

    try {
      isLoading.value = true
      error.value = null

      const configStore = useConfigStore()
      if (!cartographer.value) {
        throw new Error('Cartographer not initialized')
      }
      const service = cartographer.value.geoData

      // Use TerritoryDataLoader to handle unified data loading
      const loader = TerritoryDataLoader.fromPattern(configStore.currentAtlasConfig.pattern)
      const result = await loader.loadUnifiedData(service, mode, {
        atlasConfig: configStore.currentAtlasConfig,
        atlasService: configStore.atlasService,
        hasTerritorySelector: configStore.currentAtlasConfig.hasTerritorySelector ?? false,
        isWildcard: configStore.currentAtlasConfig.isWildcard ?? false,
      })

      rawUnifiedData.value = result.data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error loading raw unified data'
      console.error('Error loading raw unified data:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  // Removed rendering methods - rendering now handled by Cartographer directly
  // See RENDERING_REFACTOR_PROPOSAL.md for details

  const clearError = () => {
    error.value = null
  }

  const reinitialize = async () => {
    // Reset state
    isInitialized.value = false
    mainlandData.value = null
    overseasTerritoriesData.value = []
    rawUnifiedData.value = null
    cartographer.value = null

    // Reinitialize
    await initialize()
  }

  return {
    // Services
    cartographer,

    // State
    isLoading,
    error,
    isInitialized,
    mainlandData,
    overseasTerritoriesData,
    rawUnifiedData,

    // Computed
    filteredTerritories,
    territoryGroups,

    // Actions
    initialize,
    reinitialize,
    loadTerritoryData,
    loadRawUnifiedData,
    clearError,
  }
})
