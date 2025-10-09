import type { TerritoryConfig } from '@/types'
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

      // For equal-members atlases (EU): all countries are treated as individual territories
      // For single-focus atlases (France): primary is separate from secondary territories
      const isSingleFocusPattern = configStore.currentAtlasConfig.pattern === 'single-focus'

      if (isSingleFocusPattern) {
        // Single-focus pattern: load primary and secondary separately
        const [mainland, overseas] = await Promise.all([
          service.getMainLandData(),
          service.getOverseasData(),
        ])

        mainlandData.value = mainland
        overseasTerritoriesData.value = overseas || []
      }
      else {
        // Equal-members pattern: load all territories as equal individual territories
        const allTerritoriesData = await service.getAllTerritories()

        // Transform to the format expected by the UI
        const territories = allTerritoriesData.map((territoryData: any) => ({
          name: territoryData.territory.name,
          code: territoryData.territory.code,
          area: territoryData.territory.area,
          region: territoryData.territory.region || 'Unknown', // Generic region
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
        // For wildcard atlases, get territories from GeoDataService (loaded from data file)
        // For regular atlases, get territories from registry (static config)
        let allTerritories: TerritoryConfig[]

        if (atlasConfig.isWildcard) {
          // Load data first to ensure territories are available
          const geoTerritories = await service.getAllTerritories()
          // Convert Territory to TerritoryConfig format
          allTerritories = geoTerritories.map((gt: any) => ({
            code: gt.territory.code,
            name: gt.territory.name,
            center: gt.territory.center || [0, 0],
            offset: [0, 0],
            bounds: gt.territory.bounds
              ? [[gt.territory.bounds[0], gt.territory.bounds[1]], [gt.territory.bounds[2], gt.territory.bounds[3]]]
              : [[-180, -90], [180, 90]],
          }))
        }
        else {
          allTerritories = atlasService.getAllTerritories()
        }

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
