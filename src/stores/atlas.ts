/**
 * Atlas Store
 *
 * Bounded Context: Atlas selection and configuration
 *
 * Responsibilities:
 * - Atlas selection state (selectedAtlasId)
 * - Atlas configuration access (atlasConfig, territories)
 * - Atlas service instance for domain operations
 * - Atlas-specific computed properties (pattern, hasTerritorySelector)
 *
 * This store owns all atlas-related state previously scattered in configStore.
 * It provides a focused API for atlas operations following DDD bounded context principles.
 */

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

const debug = logger.store.config // Reuse existing logger namespace

export const useAtlasStore = defineStore('atlas', () => {

  /**
   * Currently selected atlas ID
   * This is the source of truth for which atlas is active
   */
  const selectedAtlasId = ref<AtlasId>(DEFAULT_ATLAS as AtlasId)

  /**
   * Loading state for atlas operations
   */
  const isLoading = ref(false)

  /**
   * Error state for atlas operations
   */
  const error = ref<string | null>(null)

  // Derived State (from useAtlasLoader)

  /**
   * Use async atlas loader for loading atlas configs on demand
   * This provides reactive access to the currently loaded atlas config
   */
  const { atlasConfig: currentAtlasConfig, isLoading: isAtlasLoading } = useAtlasLoader(selectedAtlasId)

  // Computed Properties (Domain Logic)

  /**
   * Atlas service for accessing atlas-specific data
   * Creates a new AtlasService instance when atlas changes
   * Depends on both selectedAtlasId AND currentAtlasConfig for reactivity
   */
  const atlasService = computed(() => {
    // Access currentAtlasConfig to create reactive dependency on loading completion
    void currentAtlasConfig.value?.id

    const isLoaded = isAtlasLoaded(selectedAtlasId.value)
    if (!isLoaded) {
      // Return a service for the default atlas as fallback during loading
      return new AtlasService(DEFAULT_ATLAS)
    }
    return new AtlasService(selectedAtlasId.value)
  })

  /**
   * All territories for the current atlas
   */
  const territories = computed<TerritoryConfig[]>(() => {
    return atlasService.value.getAllTerritories()
  })

  /**
   * Whether the atlas has a territory selector
   */
  const hasTerritorySelector = computed(() => {
    return currentAtlasConfig.value?.hasTerritorySelector ?? false
  })

  /**
   * Territory mode options for the current atlas
   */
  const territoryModeOptions = computed(() => {
    return currentAtlasConfig.value?.territoryModeOptions ?? []
  })

    const defaultTerritoryMode = computed(() => {
    if (territoryModeOptions.value.length > 0) {
      return territoryModeOptions.value[0]!.value
    }
    return 'all'
  })

  // Actions (Use Cases)

  /**
   * Select a new atlas
   * This triggers the atlas loading flow via the watcher
   *
   * @param atlasId - The ID of the atlas to select
   */
  async function selectAtlas(atlasId: AtlasId): Promise<void> {
    if (atlasId === selectedAtlasId.value) {
      return // No change needed
    }

    error.value = null
    isLoading.value = true

    try {
      // Preload the atlas to ensure it's available
      if (!isAtlasLoaded(atlasId)) {
        await loadAtlasAsync(atlasId)
      }

      // Update the selected atlas (triggers reactive updates)
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

  /**
   *
   * @param code - Territory code to look up
   * @returns Territory configuration or undefined if not found
   */
  function getTerritoryByCode(code: string): TerritoryConfig | undefined {
    // Convert: Store public API boundary
    return atlasService.value.getTerritoryByCode(code as TerritoryCode)
  }

  /**
   *
   * @param code - Territory code to look up
   * @returns Territory name or the code if not found
   */
  function getTerritoryName(code: TerritoryCode): string {
    return atlasService.value.getTerritoryName(code)
  }

  /**
   *
   * @param mode - Territory mode to filter by
   * @returns Filtered territories
   */
  function getTerritoriesForMode(mode: string): TerritoryConfig[] {
    return atlasService.value.getTerritoriesForMode(mode)
  }

  /**
   * Used during initialization
   */
  function getInitialTerritoryMode(): string {
    // Use cached config since DEFAULT_ATLAS is preloaded in main.ts
    const { atlasConfig } = getLoadedConfig(selectedAtlasId.value)
    if (atlasConfig.hasTerritorySelector && atlasConfig.territoryModeOptions && atlasConfig.territoryModeOptions.length > 0) {
      return atlasConfig.territoryModeOptions[0]!.value
    }
    throw new Error('No territory mode options available for the atlas')
  }

  // Return Public API

  return {
    selectedAtlasId,
    isLoading,
    error,

    // Derived State
    currentAtlasConfig,
    isAtlasLoading,

    // Computed (Domain Logic)
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
