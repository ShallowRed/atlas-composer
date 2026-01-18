import type { AtlasId, TerritoryCode, TerritoryConfig } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAtlasLoader } from '@/composables/useAtlasLoader'
import {
  DEFAULT_ATLAS,
  getLoadedConfig,
  isAtlasLoaded,
  loadAtlasAsync,
} from '@/core/atlases/registry'
import { AtlasService } from '@/services/atlas/atlas-service'
import { logger } from '@/utils/logger'

const debug = logger.store.config

export const useAtlasStore = defineStore('atlas', () => {
  const selectedAtlasId = ref<AtlasId>(DEFAULT_ATLAS as AtlasId)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const { atlasConfig: currentAtlasConfig, isLoading: isAtlasLoading } = useAtlasLoader(selectedAtlasId)

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

  const hasTerritorySelector = computed(() => {
    return currentAtlasConfig.value?.hasTerritorySelector ?? false
  })

  const territoryModeOptions = computed(() => {
    return currentAtlasConfig.value?.territoryModeOptions ?? []
  })

  const defaultTerritoryMode = computed(() => {
    if (territoryModeOptions.value.length > 0) {
      return territoryModeOptions.value[0]!.value
    }
    return 'all'
  })

  async function selectAtlas(atlasId: AtlasId): Promise<void> {
    if (atlasId === selectedAtlasId.value) {
      return // No change needed
    }

    error.value = null
    isLoading.value = true

    try {
      if (!isAtlasLoaded(atlasId)) {
        await loadAtlasAsync(atlasId)
      }

      selectedAtlasId.value = atlasId

      debug('Atlas selected: %s', atlasId)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      debug('Failed to select atlas %s: %O', atlasId, err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  function getTerritoryByCode(code: string): TerritoryConfig | undefined {
    return atlasService.value.getTerritoryByCode(code as TerritoryCode)
  }

  function getTerritoryName(code: TerritoryCode): string {
    return atlasService.value.getTerritoryName(code)
  }

  function getTerritoriesForMode(mode: string): TerritoryConfig[] {
    return atlasService.value.getTerritoriesForMode(mode)
  }

  function getInitialTerritoryMode(): string {
    const { atlasConfig } = getLoadedConfig(selectedAtlasId.value)
    if (atlasConfig.hasTerritorySelector && atlasConfig.territoryModeOptions && atlasConfig.territoryModeOptions.length > 0) {
      return atlasConfig.territoryModeOptions[0]!.value
    }
    throw new Error('No territory mode options available for the atlas')
  }

  return {
    selectedAtlasId,
    isLoading,
    error,
    currentAtlasConfig,
    isAtlasLoading,
    atlasService,
    territories,
    hasTerritorySelector,
    territoryModeOptions,
    defaultTerritoryMode,

    selectAtlas,
    getTerritoryByCode,
    getTerritoryName,
    getTerritoriesForMode,
    getInitialTerritoryMode,
  }
})
