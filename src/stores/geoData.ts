import type { TerritoryCode } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { TerritoryDataLoader } from '@/services/data/territory-data-loader'
import { TerritoryFilterService } from '@/services/data/territory-filter-service'

import { Cartographer } from '@/services/rendering/cartographer-service'
import { useAtlasStore } from '@/stores/atlas'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.store.geoData

export interface Territory {
  name: string
  code: TerritoryCode
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

  // Territory data - all territories treated equally
  const territoriesData = ref<Territory[]>([])
  const rawUnifiedData = ref<GeoJSON.FeatureCollection | null>(null)

  // Computed: first territory (convenience accessor)
  const firstTerritory = computed(() => territoriesData.value[0] ?? null)

  // Computed: filter territories based on view mode and territory mode
  const filteredTerritories = computed(() => {
    const atlasStore = useAtlasStore()
    const viewStore = useViewStore()
    const territories = territoriesData.value

    if (!territories || territories.length === 0) {
      return []
    }

    // For custom composite mode, filter by active territory codes
    // User can add/remove territories from the active set
    if (viewStore.viewMode === 'composite-custom') {
      const activeCodes = viewStore.activeTerritoryCodes
      // Convert: Territory.code from GeoJSON
      return territories.filter(t => activeCodes.has(t.code as TerritoryCode))
    }

    // For built-in composite mode, return all territories from preset (no filtering)
    // Preset is the source of truth for what to render
    if (viewStore.viewMode === 'built-in-composite') {
      return territories
    }

    // For split/unified modes, filter by territory mode if atlas has territory selector
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig || !atlasConfig.hasTerritorySelector) {
      return territories
    }

    const atlasService = atlasStore.atlasService

    // Use TerritoryFilterService to filter territories based on selected mode
    return TerritoryFilterService.filterTerritories(territories, {
      hasTerritorySelector: atlasConfig.hasTerritorySelector,
      territoryMode: viewStore.territoryMode,
      allTerritories: atlasService.getAllTerritories(),
      territoryModes: atlasService.getTerritoryModes() as any,
    })
  })

  /**
   * Get all active territories (alias for filtered territories)
   */
  const allActiveTerritories = computed(() => filteredTerritories.value) // Actions
  const initialize = async (atlasConfigOverride?: any) => {
    if (isInitialized.value)
      return

    const atlasStore = useAtlasStore()
    const projectionStore = useProjectionStore()

    try {
      isLoading.value = true
      error.value = null

      debug('Initializing for atlas: %s', atlasStore.selectedAtlasId)

      // Use provided atlas config or fall back to store
      const atlasConfig = atlasConfigOverride || atlasStore.currentAtlasConfig

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
        debug('Using atlas config from atlasStore (territories: %d)', Object.keys(atlasStore.currentAtlasConfig?.compositeProjectionConfig || {}).length)
      }

      // Use the geo data config from the selected region
      const geoDataConfig = atlasConfig.geoDataConfig
      const compositeConfig = atlasConfig.compositeProjectionConfig

      // Create parameter provider adapter to connect parameter store to rendering
      const parameterStore = useParameterStore()
      const projectionParams = parameterStore.globalEffectiveParameters

      const parameterProvider = {
        getEffectiveParameters: (territoryCode: string) => {
          // Convert: Parameter provider adapter boundary
          return parameterStore.getEffectiveParameters(territoryCode as TerritoryCode)
        },
        getExportableParameters: (territoryCode: string) => {
          // Convert: Parameter provider adapter boundary
          return parameterStore.getExportableParameters(territoryCode as TerritoryCode)
        },
        setTerritoryParameters: (territoryCode: string, parameters: Partial<any>) => {
          // Convert: Parameter provider adapter boundary
          parameterStore.setTerritoryParameters(territoryCode as TerritoryCode, parameters)
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
        const territoryCount = compositeConfig.territories?.length ?? 0
        debug('Composite config: %d territories', territoryCount)
      }

      cartographer.value = new Cartographer(
        geoDataConfig,
        compositeConfig,
        projectionParams,
        parameterProvider,
        projectionStore.referenceScale,
        projectionStore.canvasDimensions,
      )
      await cartographer.value.init()

      // CRITICAL: Re-read effective parameters after init to catch any
      // atlas parameters that were set during initialization but after
      // projectionParams was captured above. This ensures the cartographer
      // has the latest parameters before first render.
      const latestParams = parameterStore.globalEffectiveParameters
      if (latestParams && Object.keys(latestParams).length > 0) {
        cartographer.value.updateProjectionParams(latestParams)
        debug('Updated cartographer with latest params after init: %O', latestParams)
      }

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
    const atlasStore = useAtlasStore()

    if (!cartographer.value) {
      throw new Error('Cannot reload unified data: Cartographer not initialized')
    }
    if (!atlasStore.currentAtlasConfig) {
      throw new Error('Cannot reload unified data: Atlas config not loaded')
    }

    try {
      isLoading.value = true
      error.value = null

      const service = cartographer.value.geoData
      const loader = TerritoryDataLoader.create()
      const result = await loader.loadUnifiedData(service, territoryMode, {
        atlasConfig: atlasStore.currentAtlasConfig,
        atlasService: atlasStore.atlasService,
        hasTerritorySelector: atlasStore.currentAtlasConfig.hasTerritorySelector ?? false,
        isWildcard: atlasStore.currentAtlasConfig.isWildcard ?? false,
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

    const atlasStore = useAtlasStore()
    if (!atlasStore.currentAtlasConfig) {
      throw new Error('Atlas config not loaded')
    }

    try {
      isLoading.value = true
      error.value = null

      debug('Preloading all data types for atlas: %s', atlasStore.currentAtlasConfig.id)

      // Load both territory and unified data in parallel
      await Promise.all([
        (async () => {
          if (!cartographer.value) {
            throw new Error('Cartographer not initialized')
          }
          const service = cartographer.value.geoData
          const loader = TerritoryDataLoader.create()
          const result = await loader.loadTerritories(service)

          territoriesData.value = result.territories
          debug('Loaded %d territories', result.territories.length)
        })(),

        (async () => {
          if (!cartographer.value) {
            throw new Error('Cartographer not initialized')
          }
          const service = cartographer.value.geoData
          const loader = TerritoryDataLoader.create()
          const result = await loader.loadUnifiedData(service, territoryMode, {
            atlasConfig: atlasStore.currentAtlasConfig!,
            atlasService: atlasStore.atlasService,
            hasTerritorySelector: atlasStore.currentAtlasConfig!.hasTerritorySelector ?? false,
            isWildcard: atlasStore.currentAtlasConfig!.isWildcard ?? false,
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
    territoriesData.value = []
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
    territoriesData.value = []
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
    territoriesData,
    rawUnifiedData,
    renderKey, // Expose render key for components to watch

    // Computed
    firstTerritory,
    filteredTerritories,
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
