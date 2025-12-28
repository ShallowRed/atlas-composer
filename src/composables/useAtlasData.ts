import type { AtlasId } from '@/types'
import { computed } from 'vue'
import { getAvailableViewModes, getDefaultViewMode } from '@/core/atlases/registry'
import { InitializationService } from '@/services/initialization/initialization-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

/**
 * Manages atlas data loading and provides centralized atlas configuration access
 *
 * Combines loading operations with reactive access to atlas config and service.
 * State management is handled by appStore for centralized lifecycle tracking.
 *
 * @example
 * ```ts
 * const { currentAtlasConfig, atlasService, isAtlasLoaded, initialize } = useAtlasData()
 *
 * if (isAtlasLoaded.value) {
 *   console.log(currentAtlasConfig.value.id)
 * }
 * ```
 */
export function useAtlasData() {
  const atlasStore = useAtlasStore()
  const appStore = useAppStore()
  const geoDataStore = useGeoDataStore()
  const uiStore = useUIStore()
  const viewStore = useViewStore()

  // Atlas configuration access (from atlasStore)
  const currentAtlasConfig = computed(() => atlasStore.currentAtlasConfig)
  const atlasService = computed(() => atlasStore.atlasService)
  const isAtlasLoaded = computed(() => currentAtlasConfig.value !== null)
  const atlasId = computed(() => currentAtlasConfig.value?.id ?? '')

  /**
   * Initialize atlas data on mount
   * Calls InitializationService which handles preset loading and data preloading
   * State transitions are managed by appStore (called from InitializationService)
   */
  async function initialize() {
    try {
      // Initialize theme
      uiStore.initializeTheme()

      // Call InitializationService to initialize atlas
      // InitializationService manages appStore state transitions
      const result = await InitializationService.initializeAtlas({
        atlasId: atlasStore.selectedAtlasId,
      })

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Atlas initialization failed')
      }

      debug('InitializationService completed successfully')
    }
    catch (err) {
      appStore.setError(err instanceof Error ? err.message : 'Erreur lors de l\'initialisation')
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation'
      debug('Initialization error: %O', err)
    }
  }

  /**
   * Reinitialize data when atlas changes
   */
  async function reinitialize() {
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig) {
      debug('Cannot reinitialize - atlas config not loaded')
      return
    }

    // Use the atlas's default view mode if current mode is not supported
    // Convert: atlasConfig.id is string from JSON, functions expect AtlasId
    const availableViewModes = getAvailableViewModes(atlasConfig.id as AtlasId)
    const targetViewMode = availableViewModes.includes(viewStore.viewMode)
      ? viewStore.viewMode
      : getDefaultViewMode(atlasConfig.id as AtlasId)

    debug('Starting reinitialize (current: %s, target: %s, available: %o)', viewStore.viewMode, targetViewMode, availableViewModes)

    try {
      await geoDataStore.reinitialize()

      // Phase 4: Data preloading is now handled by InitializationService
      // When atlas changes, InitializationService preloads all data types
      // No conditional loading needed here - all data is already loaded
      debug('Reinitialize complete, data preloaded by InitializationService')
    }
    catch (err) {
      appStore.setError(err instanceof Error ? err.message : 'Erreur lors du changement de région')
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors du changement de région'
      debug('Region change error: %O', err)
    }
  }

  /**
   * Reload unified data when territory mode changes
   */
  async function reloadUnifiedData() {
    if (viewStore.viewMode === 'unified') {
      await geoDataStore.reloadUnifiedData(viewStore.territoryMode)
    }
  }

  return {
    // Atlas configuration (merged from useAtlasConfig)
    currentAtlasConfig,
    atlasService,
    isAtlasLoaded,
    atlasId,
    // Operations
    initialize,
    reinitialize,
    reloadUnifiedData,
  }
}
