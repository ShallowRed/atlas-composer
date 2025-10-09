import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getTerritoriesForMode } from '@/core/atlases/utils'
import { Cartographer } from '@/services/cartographer-service' // Updated import path
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

    if (!territories || territories.length === 0)
      return []

    const atlasConfig = configStore.currentAtlasConfig
    const atlasService = configStore.atlasService

    // Check if there are territory modes defined for filtering
    const hasTerritoryModes = atlasConfig.hasTerritorySelector

    // If no territory modes, return all territories (no filtering available)
    if (!hasTerritoryModes) {
      return territories
    }

    // Get allowed territories for the current mode
    const allTerritories = atlasService.getAllTerritories()
    const territoryModes = atlasService.getTerritoryModes()
    const allowedTerritories = getTerritoriesForMode(
      allTerritories,
      configStore.territoryMode,
      territoryModes,
    )
    const allowedCodes = allowedTerritories.map(t => t.code)

    // Filter territories based on mode
    return territories.filter(territory =>
      territory && territory.code && allowedCodes.includes(territory.code),
    )
  })

  const territoryGroups = computed(() => {
    const groups = new Map<string, Territory[]>()

    for (const territory of filteredTerritories.value) {
      const region = territory.region || 'Other'
      if (!groups.has(region)) {
        groups.set(region, [])
      }
      groups.get(region)!.push(territory)
    }

    return groups
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

      // Access the geoDataService through the cartographer
      const service = (cartographer.value as any).geoDataService

      // For multi-mainland atlases (EU): all countries are treated as individual territories
      // For traditional atlases (France): mainland is separate from overseas territories
      const isTraditionalPattern = configStore.currentAtlasConfig.pattern === 'traditional'

      if (isTraditionalPattern) {
        // Traditional pattern: load mainland and overseas separately
        const [mainland, overseas] = await Promise.all([
          service.getMainLandData(),
          service.getOverseasData(),
        ])

        mainlandData.value = mainland
        overseasTerritoriesData.value = overseas || []
      }
      else {
        // Multi-mainland pattern: load all territories as equal individual territories
        const allTerritoriesData = await service.getAllTerritories()

        // Transform to the format expected by the UI
        const territories = allTerritoriesData.map((territoryData: any) => ({
          name: territoryData.territory.name,
          code: territoryData.territory.code,
          area: territoryData.territory.area,
          region: 'Europe', // Generic region for EU countries
          data: {
            type: 'FeatureCollection' as const,
            features: [territoryData.feature],
          },
        }))

        mainlandData.value = null
        overseasTerritoriesData.value = territories
      }
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
      const service = (cartographer.value as any).geoDataService

      // Get territory codes based on current region and mode using TerritoryService
      const atlasService = configStore.atlasService
      const atlasConfig = configStore.currentAtlasConfig

      let territoryCodes: readonly string[] | undefined

      // Check if atlas has territory modes for filtering
      if (!atlasConfig.hasTerritorySelector) {
        // No territory modes defined: include all territories
        territoryCodes = undefined
      }
      else {
        // Get allowed territories for the mode
        const allTerritories = atlasService.getAllTerritories()
        const territoryModes = atlasService.getTerritoryModes()
        const allowedTerritories = getTerritoriesForMode(
          allTerritories,
          mode,
          territoryModes,
        )
        territoryCodes = allowedTerritories.map(t => t.code)
      }

      rawUnifiedData.value = await service.getRawUnifiedData(mode, territoryCodes)
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
