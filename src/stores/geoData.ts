import { defineStore } from 'pinia'

import { computed, ref } from 'vue'
import { TerritoryDataLoader } from '@/services/data/territory-data-loader'
import { TerritoryFilterService } from '@/services/data/territory-filter-service'

import { Cartographer } from '@/services/rendering/cartographer-service'
import { useConfigStore } from '@/stores/config'
import { useParameterStore } from '@/stores/parameters'

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
  const renderKey = ref(0) // Reactive key to trigger re-renders

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
    if (!atlasConfig)
      return []

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

      console.info('[GeoDataStore] Initializing for atlas:', configStore.selectedAtlas)

      // Wait for atlas config to be loaded before initializing
      if (!configStore.currentAtlasConfig) {
        console.warn('[GeoDataStore] Atlas config not loaded yet, deferring initialization')
        isLoading.value = false
        return
      }

      console.debug('[GeoDataStore] Atlas config loaded:', {
        atlasId: configStore.currentAtlasConfig.id,
        viewModes: configStore.currentAtlasConfig.supportedViewModes,
      })

      // Use the geo data config from the selected region
      const geoDataConfig = configStore.currentAtlasConfig.geoDataConfig
      let compositeConfig = configStore.currentAtlasConfig.compositeProjectionConfig

      // Create parameter provider adapter to connect parameter store to rendering
      const parameterStore = useParameterStore()
      const projectionParams = parameterStore.globalEffectiveParameters

      const parameterProvider = {
        getEffectiveParameters: (territoryCode: string) => {
          return parameterStore.getEffectiveParameters(territoryCode)
        },
        getExportableParameters: (territoryCode: string) => {
          return parameterStore.getExportableParameters(territoryCode)
        },
      }

      // CRITICAL: Filter compositeConfig to only include territories with projectionId in parameter store
      // This ensures only territories defined in the preset are rendered on initial load
      if (compositeConfig) {
        const territoriesWithParams = new Set<string>()

        // Check which territories have projectionId in parameter store
        if (compositeConfig.type === 'single-focus') {
          // Always include mainland
          territoriesWithParams.add(compositeConfig.mainland.code)

          // Filter overseas territories
          const filteredOverseas = compositeConfig.overseasTerritories.filter((territory) => {
            const params = parameterStore.getEffectiveParameters(territory.code)
            const hasParams = !!params.projectionId
            if (hasParams) {
              territoriesWithParams.add(territory.code)
            }
            return hasParams
          })

          compositeConfig = {
            ...compositeConfig,
            overseasTerritories: filteredOverseas,
          }

          console.info(`[GeoDataStore] Filtered composite config: ${territoriesWithParams.size} territories with parameters (${filteredOverseas.length} overseas)`)
        }
        else if (compositeConfig.type === 'equal-members') {
          // Filter mainlands
          const filteredMainlands = compositeConfig.mainlands.filter((territory) => {
            const params = parameterStore.getEffectiveParameters(territory.code)
            const hasParams = !!params.projectionId
            if (hasParams) {
              territoriesWithParams.add(territory.code)
            }
            return hasParams
          })

          // Filter overseas territories
          const filteredOverseas = compositeConfig.overseasTerritories.filter((territory) => {
            const params = parameterStore.getEffectiveParameters(territory.code)
            const hasParams = !!params.projectionId
            if (hasParams) {
              territoriesWithParams.add(territory.code)
            }
            return hasParams
          })

          compositeConfig = {
            ...compositeConfig,
            mainlands: filteredMainlands,
            overseasTerritories: filteredOverseas,
          }

          console.info(`[GeoDataStore] Filtered composite config: ${territoriesWithParams.size} territories with parameters (${filteredMainlands.length} mainlands, ${filteredOverseas.length} overseas)`)
        }
      }

      cartographer.value = new Cartographer(
        geoDataConfig,
        compositeConfig,
        projectionParams,
        parameterProvider,
        configStore.referenceScale,
        configStore.canvasDimensions,
      )
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
      if (!configStore.currentAtlasConfig) {
        throw new Error('Atlas config not loaded')
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
      if (!configStore.currentAtlasConfig) {
        throw new Error('Atlas config not loaded')
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
    console.info('[GeoDataStore] Reinitializing - resetting state and reloading data')

    // Reset state
    isInitialized.value = false
    mainlandData.value = null
    overseasTerritoriesData.value = []
    rawUnifiedData.value = null
    cartographer.value = null

    // Reinitialize
    await initialize()

    console.info('[GeoDataStore] Reinitialization complete')
  }

  /**
   * Force a re-render of the map
   * Increments renderKey to trigger Vue reactivity
   */
  const triggerRender = () => {
    renderKey.value++
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
    renderKey, // Expose render key for components to watch

    // Computed
    filteredTerritories,
    territoryGroups,

    // Actions
    initialize,
    reinitialize,
    loadTerritoryData,
    loadRawUnifiedData,
    clearError,
    triggerRender, // Expose method to force re-render
  }
})
