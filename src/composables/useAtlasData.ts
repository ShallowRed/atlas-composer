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
      console.log('[useAtlasData] About to await initializeWithPresetMetadata')
      if (typeof configStore.initializeWithPresetMetadata === 'function') {
        await configStore.initializeWithPresetMetadata()
        console.log('[useAtlasData] initializeWithPresetMetadata completed')
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

        // Load territory data for initial render if needed
        // Both split and composite-custom modes need territory data for individual projections
        if (configStore.viewMode === 'split' || configStore.viewMode === 'composite-custom') {
          if (!geoDataStore.overseasTerritoriesData.length) {
            await geoDataStore.loadTerritoryData()
          }
        }
        // Load unified data for unified mode
        else if (configStore.viewMode === 'unified') {
          if (!geoDataStore.rawUnifiedData) {
            await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
          }
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
    try {
      await withMinLoadingTime(async () => {
        await geoDataStore.reinitialize()

        // Load territory data for split and composite-custom modes
        if (configStore.viewMode === 'split' || configStore.viewMode === 'composite-custom') {
          await geoDataStore.loadTerritoryData()
        }
        // Load unified data for unified mode
        else if (configStore.viewMode === 'unified') {
          await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
        }
      })
    }
    catch (err) {
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors du changement de région'
      console.error('Region change error:', err)
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
    // Watch for view mode changes to load territory data when needed
    watch(() => configStore.viewMode, async (newMode) => {
      await loadDataForViewMode(newMode)
    })

    // Watch for region changes to reinitialize data
    watch(() => configStore.selectedAtlas, async () => {
      await reinitialize()
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
