import { computed } from 'vue'
import { InitializationService } from '@/services/initialization/initialization-service'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useUIStore } from '@/stores/ui'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

export function useAtlasData() {
  const atlasStore = useAtlasStore()
  const geoDataStore = useGeoDataStore()
  const uiStore = useUIStore()

  const currentAtlasConfig = computed(() => atlasStore.currentAtlasConfig)

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
      geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation'
      debug('Initialization error: %O', err)
    }
  }

  return {
    currentAtlasConfig,

    initialize,
  }
}
