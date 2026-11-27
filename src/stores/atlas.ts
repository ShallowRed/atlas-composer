import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import type { LatitudeBand } from '@/core/parameters'
import type { AtlasConfigError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { AtlasConfig, AtlasId, TerritoryCode, TerritoryConfig } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  DEFAULT_ATLAS,
  getAtlasConfig,
  getAtlasSpecificConfig,
  getLoadedConfig,
  isAtlasLoaded,
} from '@/core/atlases/registry'
import { getInitialTerritoryMode as initialTerritoryModeOf } from '@/core/atlases/utils'
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

  // The collections of the selected atlas once its configuration is loaded: the registry cache that holds them is not reactive
  const territoryCollections = computed(() => currentAtlasConfig.value?.id === selectedAtlasId.value
    ? getAtlasSpecificConfig(selectedAtlasId.value).territoryCollections
    : undefined)

  const territoryModeOptions = computed(() => {
    return currentAtlasConfig.value?.territoryModeOptions ?? []
  })

  async function loadAtlas(atlasId: AtlasId): Promise<Result<LoadedAtlasConfig, AtlasConfigError>> {
    const result = await loadAtlasConfiguration(atlasId)
    if (result.ok && atlasId === selectedAtlasId.value) {
      currentAtlasConfig.value = result.value.atlasConfig
    }
    return result
  }

  function territory(territoryCode: TerritoryCode): TerritoryConfig {
    const found = territories.value.find(candidate => candidate.code === territoryCode)
    if (!found) {
      throw new Error(`[AtlasStore] Territory ${territoryCode} is not in the atlas ${selectedAtlasId.value}`)
    }
    return found
  }

  function territoryCenter(territoryCode: TerritoryCode): [number, number] {
    return territory(territoryCode).center
  }

  const territoryCodes = computed(() => territories.value.map(({ code }) => code))

  function getInitialTerritoryMode(): string {
    return initialTerritoryModeOf(getLoadedConfig(selectedAtlasId.value).atlasConfig)
  }

  // Latitudes south and north of the bounds that the configuration declares for a territory
  function latitudeBand(territoryCode: string): LatitudeBand | null {
    const bounds = territories.value.find(territory => territory.code === territoryCode)?.bounds
    return bounds ? [bounds[0][1], bounds[1][1]] : null
  }

  function displayedLatitudeBand(territoryCodes: readonly string[]): LatitudeBand | null {
    const bands = territoryCodes.map(latitudeBand).filter(band => band !== null)
    return bands.length > 0
      ? [Math.min(...bands.map(([south]) => south)), Math.max(...bands.map(([, north]) => north))]
      : null
  }

  return {
    selectedAtlasId,
    currentAtlasConfig,
    atlasService,
    territories,
    territoryCodes,
    territory,
    territoryCenter,
    territoryCollections,
    territoryModeOptions,

    loadAtlas,
    getInitialTerritoryMode,
    latitudeBand,
    displayedLatitudeBand,
  }
})
