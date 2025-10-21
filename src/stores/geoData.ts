import { defineStore } from 'pinia'

import { computed, ref } from 'vue'
import { TerritoryDataLoader } from '@/services/data/territory-data-loader'
import { TerritoryFilterService } from '@/services/data/territory-filter-service'

import { Cartographer } from '@/services/rendering/cartographer-service'
import { useConfigStore } from '@/stores/config'
import { useParameterStore } from '@/stores/parameters'
import { logger } from '@/utils/logger'

const debug = logger.store.geoData

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
  const isReinitializing = ref(false) // Prevents renders during atlas switches
  const renderKey = ref(0) // Reactive key to trigger re-renders

  // Territory data
  const mainlandData = ref<GeoJSON.FeatureCollection | null>(null)
  const overseasTerritoriesData = ref<Territory[]>([])
  const rawUnifiedData = ref<GeoJSON.FeatureCollection | null>(null)

  // Computed
  // Filter overseas/secondary territories based on view mode and territory mode
  // Note: This does NOT include mainland - use mainlandData separately or allActiveTerritories for complete list
  const overseasTerritories = computed(() => {
    const configStore = useConfigStore()
    const territories = overseasTerritoriesData.value

    if (!territories || territories.length === 0) {
      return []
    }

    // For custom composite mode, filter by active territory codes
    // User can add/remove territories from the active set
    if (configStore.viewMode === 'composite-custom') {
      const activeCodes = configStore.activeTerritoryCodes
      return territories.filter(t => activeCodes.has(t.code))
    }

    // For built-in composite mode, return all territories from preset (no filtering)
    // Preset is the source of truth for what to render
    if (configStore.viewMode === 'built-in-composite') {
      return territories
    }

    // For split/unified modes, filter by territory mode if atlas has territory selector
    const atlasConfig = configStore.currentAtlasConfig
    if (!atlasConfig || !atlasConfig.hasTerritorySelector) {
      return territories
    }

    const atlasService = configStore.atlasService

    // Use TerritoryFilterService to filter territories based on selected mode
    return TerritoryFilterService.filterTerritories(territories, {
      hasTerritorySelector: atlasConfig.hasTerritorySelector,
      territoryMode: configStore.territoryMode,
      allTerritories: atlasService.getAllTerritories(),
      territoryModes: atlasService.getTerritoryModes() as any,
    })
  })

  /**
   * Get all active territories including mainland (when applicable)
   * Useful for operations that need to include both mainland and overseas
   */
  const allActiveTerritories = computed(() => {
    const configStore = useConfigStore()
    const atlasConfig = configStore.currentAtlasConfig
    const mainlandCode = atlasConfig?.geoDataConfig?.mainlandCode

    // Create a mainland territory object if we have mainland data
    const mainlandTerritory: Territory | null = mainlandCode && mainlandData.value
      ? {
          code: mainlandCode,
          name: atlasConfig?.splitModeConfig?.mainlandTitle || mainlandCode,
          data: mainlandData.value,
        } as Territory
      : null

    // Combine mainland and overseas territories
    if (mainlandTerritory) {
      return [mainlandTerritory, ...overseasTerritories.value]
    }

    return overseasTerritories.value
  }) // Actions
  const initialize = async (atlasConfigOverride?: any) => {
    if (isInitialized.value)
      return

    const configStore = useConfigStore()

    try {
      isLoading.value = true
      error.value = null

      debug('Initializing for atlas: %s', configStore.selectedAtlas)

      // Use provided atlas config or fall back to store
      const atlasConfig = atlasConfigOverride || configStore.currentAtlasConfig

      // Wait for atlas config to be loaded before initializing
      if (!atlasConfig) {
        debug('Atlas config not loaded yet, deferring initialization')
        isLoading.value = false
        return
      }

      if (atlasConfigOverride) {
        debug('Using filtered atlas config from InitializationService (territories: %d)', Object.keys(atlasConfigOverride.compositeProjectionConfig || {}).length)
      }
      else {
        debug('Using atlas config from configStore (territories: %d)', Object.keys(configStore.currentAtlasConfig?.compositeProjectionConfig || {}).length)
      }

      // Use the geo data config from the selected region
      const geoDataConfig = atlasConfig.geoDataConfig
      const compositeConfig = atlasConfig.compositeProjectionConfig

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

      // Reactivity System Refactor: Removed territory filtering logic
      // Previously filtered territories by projectionId presence in parameter store,
      // but this caused race conditions during atlas switching.
      //
      // New approach: Trust that compositeConfig from preset only contains intended territories.
      // InitializationService validates parameters before creating Cartographer.
      // If preset is invalid, initialization fails explicitly (fail fast) rather than
      // silently filtering territories.
      debug('Using composite config directly from preset (no filtering)')
      if (compositeConfig) {
        if (compositeConfig.type === 'single-focus') {
          debug('Composite config: 1 mainland + %d overseas territories', compositeConfig.overseasTerritories.length)
        }
        else if (compositeConfig.type === 'equal-members') {
          debug('Composite config: %d mainlands + %d overseas territories', compositeConfig.mainlands.length, compositeConfig.overseasTerritories.length)
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

      // Store a timestamp ID to track cartographer instances
      const cartographerId = Date.now()
      ;(cartographer.value as any).__id = cartographerId
      ;(cartographer.value as any).__atlasId = atlasConfig.id
      ;(cartographer.value as any).__territories = Object.keys(compositeConfig || {})

      debug('Cartographer created (id: %d, atlas: %s, territories: %d)', cartographerId, atlasConfig.id, Object.keys(compositeConfig || {}).length)
      isInitialized.value = true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error initializing geo data'
      debug('Geo data store initialization error: %O', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Reload unified data for a specific territory mode
   * Used when territory mode changes in unified view
   * Assumes cartographer is already initialized
   */
  const reloadUnifiedData = async (territoryMode: string) => {
    const configStore = useConfigStore()

    if (!cartographer.value) {
      throw new Error('Cannot reload unified data: Cartographer not initialized')
    }
    if (!configStore.currentAtlasConfig) {
      throw new Error('Cannot reload unified data: Atlas config not loaded')
    }

    try {
      isLoading.value = true
      error.value = null

      const service = cartographer.value.geoData
      const loader = TerritoryDataLoader.fromPattern(configStore.currentAtlasConfig.pattern)
      const result = await loader.loadUnifiedData(service, territoryMode, {
        atlasConfig: configStore.currentAtlasConfig,
        atlasService: configStore.atlasService,
        hasTerritorySelector: configStore.currentAtlasConfig.hasTerritorySelector ?? false,
        isWildcard: configStore.currentAtlasConfig.isWildcard ?? false,
      })

      rawUnifiedData.value = result.data
      debug('Reloaded unified data for mode: %s', territoryMode)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error reloading unified data'
      debug('Error reloading unified data: %O', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Load all data types for current atlas in parallel
   * Phase 4: Preload strategy - loads territory + unified data upfront
   * Makes view mode switching synchronous (no async delays)
   */
  const loadAllAtlasData = async (territoryMode: string) => {
    if (!cartographer.value) {
      await initialize()
    }

    const configStore = useConfigStore()
    if (!configStore.currentAtlasConfig) {
      throw new Error('Atlas config not loaded')
    }

    try {
      isLoading.value = true
      error.value = null

      debug('Preloading all data types for atlas: %s', configStore.currentAtlasConfig.id)

      // Load both territory and unified data in parallel
      await Promise.all([
        (async () => {
          if (!cartographer.value) {
            throw new Error('Cartographer not initialized')
          }
          const service = cartographer.value.geoData
          const loader = TerritoryDataLoader.fromPattern(configStore.currentAtlasConfig!.pattern)
          const result = await loader.loadTerritories(service)

          mainlandData.value = result.mainlandData
          overseasTerritoriesData.value = result.territories
          debug('Loaded %d territories', result.territories.length)
        })(),

        (async () => {
          if (!cartographer.value) {
            throw new Error('Cartographer not initialized')
          }
          const service = cartographer.value.geoData
          const loader = TerritoryDataLoader.fromPattern(configStore.currentAtlasConfig!.pattern)
          const result = await loader.loadUnifiedData(service, territoryMode, {
            atlasConfig: configStore.currentAtlasConfig!,
            atlasService: configStore.atlasService,
            hasTerritorySelector: configStore.currentAtlasConfig!.hasTerritorySelector ?? false,
            isWildcard: configStore.currentAtlasConfig!.isWildcard ?? false,
          })

          rawUnifiedData.value = result.data
          debug('Loaded unified data')
        })(),
      ])

      debug('All atlas data preloaded successfully')
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error preloading atlas data'
      debug('Error preloading atlas data: %O', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Clear all geodata (used when switching atlases)
   * Phase 4: Clear reset strategy
   */
  const clearAllData = () => {
    debug('Clearing all geodata')
    mainlandData.value = null
    overseasTerritoriesData.value = []
    rawUnifiedData.value = null
    error.value = null
  }

  // Removed rendering methods - rendering now handled by Cartographer directly
  // See RENDERING_REFACTOR_PROPOSAL.md for details

  const clearError = () => {
    error.value = null
  }

  const reinitialize = async (atlasConfigOverride?: any) => {
    debug('Reinitializing - resetting state and reloading data (override: %s)', !!atlasConfigOverride)

    // Set reinitializing flag to prevent renders during atlas switch
    isReinitializing.value = true

    // Reset state
    isInitialized.value = false
    mainlandData.value = null
    overseasTerritoriesData.value = []
    rawUnifiedData.value = null

    const oldCartographer = cartographer.value
    cartographer.value = null
    if (oldCartographer) {
      debug('Cleared existing cartographer instance')
    }

    // Reinitialize with optional filtered config
    await initialize(atlasConfigOverride)

    // Clear reinitializing flag - renders can now proceed
    isReinitializing.value = false

    debug('Reinitialization complete (cartographer: %s, initialized: %s)', !!cartographer.value, isInitialized.value)
  }

  /**
   * Force a re-render of the map
   * Increments renderKey to trigger Vue reactivity
   */
  const triggerRender = () => {
    debug('triggerRender() - renderKey: %d → %d', renderKey.value, renderKey.value + 1)
    renderKey.value++
  }

  /**
   * Set reinitializing flag (for external use by InitializationService)
   */
  const setReinitializing = (value: boolean) => {
    isReinitializing.value = value
  }

  return {
    // Services
    cartographer,

    // State
    isLoading,
    error,
    isInitialized,
    isReinitializing,
    mainlandData,
    overseasTerritoriesData,
    rawUnifiedData,
    renderKey, // Expose render key for components to watch

    // Computed
    overseasTerritories,
    allActiveTerritories,

    // Actions
    initialize,
    reinitialize,
    setReinitializing,
    reloadUnifiedData,
    loadAllAtlasData,
    clearAllData,
    clearError,
    triggerRender, // Expose method to force re-render
  }
})
