import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import type { AtlasConfig, AtlasId, TerritoryConfig } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import {
  DEFAULT_ATLAS,
  getAtlasConfig,
  getLoadedConfig,
  isAtlasLoaded,
} from '@/core/atlases/registry'
import { getInitialTerritoryMode as initialTerritoryModeOf } from '@/core/atlases/utils'
import { loadAtlasConfiguration } from '@/services/atlas/atlas-config-loader'
import { AtlasService } from '@/services/atlas/atlas-service'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

export const useAtlasStore = defineStore('atlas', () => {
  const selectedAtlasId = ref<AtlasId>(DEFAULT_ATLAS as AtlasId)

  const currentAtlasConfig = shallowRef<AtlasConfig | undefined>(
    isAtlasLoaded(selectedAtlasId.value) ? getAtlasConfig(selectedAtlasId.value) : undefined,
  )

  const atlasService = computed(() => {
    void currentAtlasConfig.value?.id

    const isLoaded = isAtlasLoaded(selectedAtlasId.value)
    if (!isLoaded) {
      return new AtlasService(DEFAULT_ATLAS)
    }
    return new AtlasService(selectedAtlasId.value)
  })

  const territories = computed<TerritoryConfig[]>(() => {
    return atlasService.value.getAllTerritories()
  })

  const territoryModeOptions = computed(() => {
    return currentAtlasConfig.value?.territoryModeOptions ?? []
  })

  async function loadAtlas(atlasId: AtlasId): Promise<LoadedAtlasConfig> {
    const loadedConfig = await loadAtlasConfiguration(atlasId)
    if (atlasId === selectedAtlasId.value) {
      currentAtlasConfig.value = loadedConfig.atlasConfig
    }
    return loadedConfig
  }

  watch(selectedAtlasId, (atlasId) => {
    loadAtlas(atlasId).catch(error => debug('Failed to load atlas: %o', error))
  })

  function getInitialTerritoryMode(): string {
    return initialTerritoryModeOf(getLoadedConfig(selectedAtlasId.value).atlasConfig)
  }

  return {
    selectedAtlasId,
    currentAtlasConfig,
    atlasService,
    territories,
    territoryModeOptions,

    loadAtlas,
    getInitialTerritoryMode,
  }
})
