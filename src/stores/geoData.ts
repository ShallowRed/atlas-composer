import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { Cartographer } from '@/cartographer/Cartographer'
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
  const metropolitanFranceData = ref<GeoJSON.FeatureCollection | null>(null)
  const domtomTerritoriesData = ref<Territory[]>([])
  const rawUnifiedData = ref<GeoJSON.FeatureCollection | null>(null)

  // Computed
  const filteredTerritories = computed(() => {
    const configStore = useConfigStore()
    const territories = domtomTerritoriesData.value

    if (!territories)
      return []

    switch (configStore.territoryMode) {
      case 'metropole-only':
        return []
      case 'metropole-major':
        return territories.filter(territory =>
          territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT'].includes(territory.code),
        )
      case 'metropole-uncommon':
        return territories.filter(territory =>
          territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC'].includes(territory.code),
        )
      case 'all-territories':
      default:
        return territories.filter(territory =>
          territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC', 'FR-TF', 'FR-WF', 'FR-PM'].includes(territory.code),
        )
    }
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

      console.log('Initializing geo data store...')

      cartographer.value = new Cartographer()
      await cartographer.value.init()

      isInitialized.value = true
      console.log('Geo data store initialized successfully')
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
      const [metroData, domtomData] = await Promise.all([
        service.getMetropoleData(),
        service.getDOMTOMData(),
      ])

      metropolitanFranceData.value = metroData
      domtomTerritoriesData.value = domtomData || []

      console.log('Territory data loaded:', {
        metro: !!metroData,
        domtom: domtomData?.length || 0,
      })
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

  const renderProjectionComposite = async (container: HTMLElement) => {
    if (!cartographer.value)
      return
    await cartographer.value.renderProjectionComposite(container)
  }

  const renderCustomComposite = async (container: HTMLElement) => {
    if (!cartographer.value)
      return

    const configStore = useConfigStore()
    console.log('[geoData] renderCustomComposite - projectionMode:', configStore.projectionMode)

    // Synchronize CustomCompositeProjection with current store state
    if (configStore.projectionMode === 'individual') {
      // Individual mode: each territory uses its own projection
      console.log('[geoData] Syncing individual projections:', configStore.territoryProjections)
      Object.entries(configStore.territoryProjections).forEach(([code, projectionType]) => {
        cartographer.value!.updateTerritoryProjection(code, projectionType)
      })
    }
    else {
      // Uniform mode: all territories use the same projection (selectedProjection)
      console.log('[geoData] Applying uniform projection to all territories:', configStore.selectedProjection)
      const allTerritoryCodes = ['FR-MET', 'FR-GP', 'FR-MQ', 'FR-GF', 'FR-RE', 'FR-YT', 'FR-NC', 'FR-PF', 'FR-PM', 'FR-BL', 'FR-MF', 'FR-WF', 'FR-TF']
      allTerritoryCodes.forEach((code) => {
        cartographer.value!.updateTerritoryProjection(code, configStore.selectedProjection)
      })
    }

    // Update translations (in pixels relative to mainland center)
    console.log('[geoData] Syncing translations:', configStore.territoryTranslations)
    Object.entries(configStore.territoryTranslations).forEach(([code, translation]) => {
      const offset: [number, number] = [translation.x || 0, translation.y || 0]
      console.log(`[geoData] Updating translation for ${code}: [${offset[0]}, ${offset[1]}]`)
      cartographer.value!.updateTerritoryTranslationOffset(code, offset)
    })

    // Update scales
    console.log('[geoData] Syncing scales:', configStore.territoryScales)
    Object.entries(configStore.territoryScales).forEach(([code, scale]) => {
      cartographer.value!.updateTerritoryScale(code, scale)
    })

    console.log('[geoData] Calling cartographer.renderCustomComposite')
    await cartographer.value.renderCustomComposite(container)
  }

  const updateCartographerSettings = () => {
    if (!cartographer.value)
      return

    const configStore = useConfigStore()
    cartographer.value.updateSettings(configStore.getCartographerSettings())
  }

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
    metropolitanFranceData,
    domtomTerritoriesData,
    rawUnifiedData,

    // Computed
    filteredTerritories,
    territoryGroups,

    // Actions
    initialize,
    loadTerritoryData,
    loadRawUnifiedData,
    renderProjectionComposite,
    renderCustomComposite,
    updateCartographerSettings,
    clearError,
  }
})
