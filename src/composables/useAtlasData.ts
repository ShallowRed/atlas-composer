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

export function useAtlasData() {
  const atlasStore = useAtlasStore()
  const appStore = useAppStore()
  const geoDataStore = useGeoDataStore()
  const uiStore = useUIStore()
  const viewStore = useViewStore()

  const currentAtlasConfig = computed(() => atlasStore.currentAtlasConfig)
  const atlasService = computed(() => atlasStore.atlasService)
  const isAtlasLoaded = computed(() => currentAtlasConfig.value !== null)
  const atlasId = computed(() => currentAtlasConfig.value?.id ?? '')

  async function initialize() {
    try {
      uiStore.initializeTheme()

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

  async function reinitialize() {
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig) {
      debug('Cannot reinitialize - atlas config not loaded')
      return
    }

    const availableViewModes = getAvailableViewModes(atlasConfig.id as AtlasId)
    const targetViewMode = availableViewModes.includes(viewStore.viewMode)
      ? viewStore.viewMode
      : getDefaultViewMode(atlasConfig.id as AtlasId)

    debug('Starting reinitialize (current: %s, target: %s, available: %o)', viewStore.viewMode, targetViewMode, availableViewModes)

    try {
      await geoDataStore.reinitialize()

      debug('Reinitialize complete, data preloaded by InitializationService')
    }
    catch (err) {
      appStore.setError(err instanceof Error ? err.message : 'Erreur lors du changement de région')
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors du changement de région'
      debug('Region change error: %O', err)
    }
  }

  async function reloadUnifiedData() {
    if (viewStore.viewMode === 'unified') {
      await geoDataStore.reloadUnifiedData(viewStore.territoryMode)
    }
  }

  return {
    currentAtlasConfig,
    atlasService,
    isAtlasLoaded,
    atlasId,

    initialize,
    reinitialize,
    reloadUnifiedData,
  }
}
