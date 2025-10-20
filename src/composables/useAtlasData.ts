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

        // Phase 4: Preload all data types for the current atlas
        // This ensures both territory and unified data are available before first render
        // Makes view mode switching synchronous with no async delays
        const hasTerritoryData = geoDataStore.overseasTerritoriesData.length > 0
        const hasUnifiedData = geoDataStore.rawUnifiedData !== null

        if (!hasTerritoryData || !hasUnifiedData) {
          console.info('[useAtlasData] Preloading all atlas data types for initial load')
          await geoDataStore.loadAllAtlasData(configStore.territoryMode)
        }
        else {
          console.info('[useAtlasData] Data already loaded, skipping preload')
        }
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
   * Phase 5: Watchers moved to useApplicationState composable
   * This function is deprecated and kept for backward compatibility
   * All reactive orchestration now happens in useApplicationState
   */
  function setupWatchers() {
    console.warn('[useAtlasData] setupWatchers is deprecated. Use useApplicationState instead.')
    // No-op: All watchers have been moved to useApplicationState composable
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
