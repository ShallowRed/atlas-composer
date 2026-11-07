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
    geoDataStore.clearError()
    uiStore.initializeTheme()

    const result = await InitializationService.initializeAtlas({
      atlasId: atlasStore.selectedAtlasId,
    })

    if (!result.success) {
      geoDataStore.failInitialization(result.errors.join(', '))
      debug('Initialization error: %O', result.errors)
      return
    }

    debug('InitializationService completed successfully')
  }

  return {
    currentAtlasConfig,

    initialize,
  }
}
