import type { AtlasId, TerritoryConfig } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAtlasLoader } from '@/composables/useAtlasLoader'
import {
  DEFAULT_ATLAS,
  getLoadedConfig,
  isAtlasLoaded,
} from '@/core/atlases/registry'
import { getInitialTerritoryMode as initialTerritoryModeOf } from '@/core/atlases/utils'
import { AtlasService } from '@/services/atlas/atlas-service'

export const useAtlasStore = defineStore('atlas', () => {
  const selectedAtlasId = ref<AtlasId>(DEFAULT_ATLAS as AtlasId)

  const { atlasConfig: currentAtlasConfig } = useAtlasLoader(selectedAtlasId)

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

  function getInitialTerritoryMode(): string {
    return initialTerritoryModeOf(getLoadedConfig(selectedAtlasId.value).atlasConfig)
  }

  return {
    selectedAtlasId,
    currentAtlasConfig,
    atlasService,
    territories,
    territoryModeOptions,

    getInitialTerritoryMode,
  }
})
