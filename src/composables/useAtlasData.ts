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
   * Phase 4/5 Refactor: InitializationService now handles preset loading and data preloading
   * This method ensures theme is initialized and waits for InitializationService to complete
   */
  async function initialize() {
    try {
      // Initialize theme
      configStore.initializeTheme()

      // Wait for InitializationService to complete
      // InitializationService is called from config store on startup and handles:
      // - Preset loading
      // - GeoDataStore initialization
      // - Data preloading (territory + unified)
      await withMinLoadingTime(async () => {
        // Poll until geoDataStore is initialized
        // Check every 50ms for up to 5 seconds
        const maxAttempts = 100 // 50ms * 100 = 5 seconds
        let attempts = 0

        while (!geoDataStore.isInitialized && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 50))
          attempts++
        }

        if (!geoDataStore.isInitialized) {
          throw new Error('Initialization timeout: GeoDataStore not initialized after 5 seconds')
        }

        console.info('[useAtlasData] InitializationService completed successfully')
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

  return {
    showSkeleton,
    initialize,
    loadDataForViewMode,
    reinitialize,
    reloadUnifiedData,
  }
}
