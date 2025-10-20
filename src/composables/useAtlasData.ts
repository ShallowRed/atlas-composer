import { watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useLoadingState } from './useLoadingState'

/**
 * Manages atlas data loading based on view mode and configuration changes
 */
export function useAtlasData() {
  const configStore = useConfigStore()
  const geoDataStore = useGeoDataStore()
  const { showSkeleton, withMinLoadingTime } = useLoadingState()

  /**
   * Initialize atlas data on mount
   */
  async function initialize() {
    try {
      // Initialize theme
      configStore.initializeTheme()

      // CRITICAL: Wait for preset metadata to load before initializing geodata
      // This ensures territory projections from presets are available before first render
      if (typeof configStore.initializeWithPresetMetadata === 'function') {
        await configStore.initializeWithPresetMetadata()
      }
      else {
        console.warn('[useAtlasData] initializeWithPresetMetadata is not a function!')
      }

      // Wrap in minimum loading time to prevent skeleton flash
      await withMinLoadingTime(async () => {
        // Only initialize if not already initialized (important for route navigation)
        if (!geoDataStore.isInitialized) {
          await geoDataStore.initialize()
        }

        // Phase 4: Data preloading is now handled by InitializationService
        // All data types (territory + unified) are loaded upfront during atlas initialization
        // This makes view mode switching synchronous with no async delays
        // No conditional loading needed here - data is already available
        console.info('[useAtlasData] Initialization complete, data preloaded by InitializationService')
      })
    }
    catch (err) {
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation'
      console.error('Initialization error:', err)
    }
  }

  /**
   * Load data based on current view mode
   */
  async function loadDataForViewMode(viewMode: string) {
    await withMinLoadingTime(async () => {
      // Load territory data for split and composite-custom modes (needed for individual projections)
      if ((viewMode === 'split' || viewMode === 'composite-custom') && !geoDataStore.overseasTerritoriesData.length) {
        await geoDataStore.loadTerritoryData()
      }
      // Load unified data for unified mode
      else if (viewMode === 'unified' && !geoDataStore.rawUnifiedData) {
        await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
      }
    })
  }

  /**
   * Reinitialize data when atlas changes
   */
  async function reinitialize() {
    const atlasConfig = configStore.currentAtlasConfig
    if (!atlasConfig) {
      console.warn('[useAtlasData] Cannot reinitialize - atlas config not loaded')
      return
    }

    // Use the atlas's default view mode if current mode is not supported
    const targetViewMode = atlasConfig.supportedViewModes.includes(configStore.viewMode)
      ? configStore.viewMode
      : atlasConfig.defaultViewMode

    console.info('[useAtlasData] Starting reinitialize for viewMode:', {
      currentViewMode: configStore.viewMode,
      targetViewMode,
      supportedViewModes: atlasConfig.supportedViewModes,
    })

    try {
      await withMinLoadingTime(async () => {
        await geoDataStore.reinitialize()

        // Phase 4: Data preloading is now handled by InitializationService
        // When atlas changes, InitializationService preloads all data types
        // No conditional loading needed here - all data is already loaded
        console.info('[useAtlasData] Reinitialize complete, data preloaded by InitializationService')
      })
    }
    catch (err) {
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors du changement de région'
      console.error('[useAtlasData] Region change error:', err)
    }
  }

  /**
   * Reload unified data when territory mode changes
   */
  async function reloadUnifiedData() {
    if (configStore.viewMode === 'unified') {
      await withMinLoadingTime(async () => {
        await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
      })
    }
  }

  /**
   * Setup watchers for automatic data loading
   */
  function setupWatchers() {
    // Phase 4: View mode changes no longer trigger async data loading
    // All data types are preloaded during initialization, making view mode switching synchronous
    // This watcher is kept for logging but data loading is removed
    watch(() => configStore.viewMode, (newMode, oldMode) => {
      console.info('[useAtlasData] viewMode changed:', { oldMode, newMode })
      console.info('[useAtlasData] Data already preloaded, view mode switch is synchronous')
    })

    // Watch for atlas config changes to reinitialize data
    // Watch currentAtlasConfig instead of selectedAtlas to ensure atlas is loaded before reinitializing
    // Initialize with current atlas to detect future changes
    let lastAtlasId: string | null = configStore.currentAtlasConfig?.id ?? null
    console.debug('[useAtlasData] setupWatchers - initializing lastAtlasId:', lastAtlasId)

    watch(() => configStore.currentAtlasConfig, async (newConfig) => {
      console.debug('[useAtlasData] currentAtlasConfig changed:', {
        newConfig: newConfig?.id,
        lastAtlasId,
        willReinitialize: newConfig && lastAtlasId !== null && lastAtlasId !== newConfig.id,
      })

      // Track the last loaded atlas ID to detect changes
      if (newConfig) {
        const newAtlasId = newConfig.id
        // Only reinitialize if the atlas actually changed (not just initial load)
        if (lastAtlasId !== null && lastAtlasId !== newAtlasId) {
          console.info(`[useAtlasData] Atlas changed from '${lastAtlasId}' to '${newAtlasId}', reinitializing...`)
          await reinitialize()
          console.info(`[useAtlasData] Reinitialization complete for '${newAtlasId}'`)
        }
        else {
          console.debug(`[useAtlasData] Skipping reinitialize - lastAtlasId: ${lastAtlasId}, newAtlasId: ${newAtlasId}`)
        }
        lastAtlasId = newAtlasId
      }
      else {
        console.debug('[useAtlasData] currentAtlasConfig is null, skipping')
      }
    })

    // Watch for territory mode changes to reload data in unified mode
    watch(() => configStore.territoryMode, async () => {
      await reloadUnifiedData()
    })
  }

  return {
    showSkeleton,
    initialize,
    loadDataForViewMode,
    reinitialize,
    reloadUnifiedData,
    setupWatchers,
  }
}
