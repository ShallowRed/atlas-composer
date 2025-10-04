import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { Cartographer } from '@/cartographer/Cartographer'
import { getTerritoriesForMode } from '@/constants/france-territories'
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

    if (!territories)
      return []

    const allowedCodes = getTerritoriesForMode(configStore.territoryMode)
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

    try {
      isLoading.value = true
      error.value = null

      cartographer.value = new Cartographer()
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

    try {
      isLoading.value = true
      error.value = null

      // Access the geoDataService through the cartographer
      const service = (cartographer.value as any).geoDataService

      // Load all territory data
      const [mainland, overseas] = await Promise.all([
        service.getMainLandData(),
        service.getOverseasData(),
      ])

      mainlandData.value = mainland
      overseasTerritoriesData.value = overseas || []
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

      const service = (cartographer.value as any).geoDataService
      rawUnifiedData.value = await service.getRawUnifiedData(mode)
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
    loadTerritoryData,
    loadRawUnifiedData,
    clearError,
  }
})
