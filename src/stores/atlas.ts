import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import type { AtlasConfigError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { AtlasConfig, AtlasId, TerritoryCode, TerritoryConfig } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  DEFAULT_ATLAS,
  getAtlasConfig,
  getLoadedConfig,
  isAtlasLoaded,
} from '@/core/atlases/registry'
import { getInitialTerritoryMode as initialTerritoryModeOf } from '@/core/atlases/utils'
import i18n from '@/i18n'
import { loadAtlasConfiguration } from '@/services/atlas/atlas-config-loader'
import { AtlasService } from '@/services/atlas/atlas-service'

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

  async function loadAtlas(atlasId: AtlasId): Promise<Result<LoadedAtlasConfig, AtlasConfigError>> {
    const result = await loadAtlasConfiguration(atlasId, i18n.global.locale.value)
    if (result.ok && atlasId === selectedAtlasId.value) {
      currentAtlasConfig.value = result.value.atlasConfig
    }
    return result
  }

  function territoryCenter(territoryCode: TerritoryCode): [number, number] {
    const territory = territories.value.find(candidate => candidate.code === territoryCode)
    if (!territory) {
      throw new Error(`[AtlasStore] Territory ${territoryCode} is not in the atlas ${selectedAtlasId.value}`)
    }
    return territory.center
  }

  function getInitialTerritoryMode(): string {
    return initialTerritoryModeOf(getLoadedConfig(selectedAtlasId.value).atlasConfig)
  }

  return {
    selectedAtlasId,
    currentAtlasConfig,
    atlasService,
    territories,
    territoryCenter,
    territoryModeOptions,

    loadAtlas,
    getInitialTerritoryMode,
  }
})
