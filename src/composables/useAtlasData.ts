import { getAvailableViewModes, getDefaultViewMode } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { logger } from '@/utils/logger'
import { useLoadingState } from './useLoadingState'

const debug = logger.atlas.loader

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

        debug('InitializationService completed successfully')
      })
    }
    catch (err) {
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation'
      debug('Initialization error: %O', err)
    }
  }

  /**
   * Reinitialize data when atlas changes
   */
  async function reinitialize() {
    const atlasConfig = configStore.currentAtlasConfig
    if (!atlasConfig) {
      debug('Cannot reinitialize - atlas config not loaded')
      return
    }

    // Use the atlas's default view mode if current mode is not supported
    const availableViewModes = getAvailableViewModes(atlasConfig.id)
    const targetViewMode = availableViewModes.includes(configStore.viewMode)
      ? configStore.viewMode
      : getDefaultViewMode(atlasConfig.id)

    debug('Starting reinitialize (current: %s, target: %s, available: %o)', configStore.viewMode, targetViewMode, availableViewModes)

    try {
      await withMinLoadingTime(async () => {
        await geoDataStore.reinitialize()

        // Phase 4: Data preloading is now handled by InitializationService
        // When atlas changes, InitializationService preloads all data types
        // No conditional loading needed here - all data is already loaded
        debug('Reinitialize complete, data preloaded by InitializationService')
      })
    }
    catch (err) {
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors du changement de région'
      debug('Region change error: %O', err)
    }
  }

  /**
   * Reload unified data when territory mode changes
   */
  async function reloadUnifiedData() {
    if (configStore.viewMode === 'unified') {
      await withMinLoadingTime(async () => {
        await geoDataStore.reloadUnifiedData(configStore.territoryMode)
      })
    }
  }

  return {
    showSkeleton,
    initialize,
    reinitialize,
    reloadUnifiedData,
  }
}
