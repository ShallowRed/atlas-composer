import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { AppError, ExportError, GeoDataError, InitializationError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { CompositeProjection } from '@/services/projection/composite-projection'
import type { Territory, TerritoryCode } from '@/types'
import type { AtlasId } from '@/types/branded'

import { DEFAULT_REFERENCE_SCALE } from '@atlas-composer/specification'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { DEFAULT_CANVAS_DIMENSIONS } from '@/core/projections/defaults'
import { err, ok } from '@/core/types/result'
import i18n from '@/i18n'
import { TerritoryDataLoader } from '@/services/data/territory-data-loader'
import { TerritoryFilterService } from '@/services/data/territory-filter-service'
import { CompositeExportService } from '@/services/export/composite-export-service'

import { Cartographer } from '@/services/rendering/cartographer-service'
import { useAtlasStore } from '@/stores/atlas'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.store.geoData

export const useGeoDataStore = defineStore('geoData', () => {
  const cartographer = ref<Cartographer | null>(null)

  const isLoading = ref(false)
  const error = ref<AppError | null>(null)
  const isInitialized = ref(false)
  const isReinitializing = ref(false)
  const renderKey = ref(0)

  const territoriesData = ref<Territory[]>([])
  const rawUnifiedData = ref<GeoJSON.FeatureCollection | null>(null)

  const filteredTerritories = computed(() => {
    const atlasStore = useAtlasStore()
    const viewStore = useViewStore()
    const territories = territoriesData.value

    if (!territories || territories.length === 0) {
      return []
    }

    if (viewStore.viewMode === 'composite-custom') {
      const activeCodes = viewStore.activeTerritoryCodes
      return territories.filter(t => activeCodes.has(t.code as TerritoryCode))
    }

    if (viewStore.viewMode === 'built-in-composite') {
      return territories
    }

    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig || !atlasConfig.hasTerritorySelector) {
      return territories
    }

    const atlasService = atlasStore.atlasService

    return TerritoryFilterService.filterTerritories(territories, {
      hasTerritorySelector: atlasConfig.hasTerritorySelector,
      territoryMode: viewStore.territoryMode,
      allTerritories: atlasService.getAllTerritories(),
      territoryModes: atlasService.getTerritoryModes() as any,
    })
  })

  const allActiveTerritories = computed(() => filteredTerritories.value)

  let initializationGeneration = 0
  let pendingInitialization: Promise<Result<void, GeoDataError>> | null = null

  const initialize = async (
    atlasConfigOverride?: any,
    generation = initializationGeneration,
  ): Promise<Result<void, GeoDataError>> => {
    if (isInitialized.value)
      return ok(undefined)

    const atlasStore = useAtlasStore()
    const projectionStore = useProjectionStore()

    try {
      isLoading.value = true
      error.value = null

      debug('Initializing for atlas: %s', atlasStore.selectedAtlasId)

      const atlasConfig = atlasConfigOverride || atlasStore.currentAtlasConfig

      if (!atlasConfig) {
        debug('Atlas config not loaded yet, deferring initialization')
        isLoading.value = false
        return ok(undefined)
      }

      if (atlasConfigOverride) {
        debug('Using filtered atlas config from the initializeAtlas action of the composition store (territories: %d)', Object.keys(atlasConfigOverride.compositeTerritories || {}).length)
      }
      else {
        debug('Using atlas config from atlasStore (territories: %d)', Object.keys(atlasStore.currentAtlasConfig?.compositeTerritories || {}).length)
      }

      const geoDataConfig = atlasConfig.geoDataConfig
      const compositeConfig = atlasConfig.compositeTerritories

      const parameterStore = useParameterStore()
      const projectionParams = parameterStore.globalEffectiveParameters

      debug('Using composite config directly from preset (no filtering)')
      if (compositeConfig) {
        const territoryCount = compositeConfig.territories?.length ?? 0
        debug('Composite config: %d territories', territoryCount)
      }

      const newCartographer = new Cartographer(
        geoDataConfig,
        compositeConfig,
        projectionParams,
        parameterStore.parameterProvider,
        projectionStore.referenceScale,
      )
      const result = await newCartographer.init()
      if (generation !== initializationGeneration) {
        return ok(undefined)
      }

      if (!result.ok) {
        error.value = result.error
        debug('Geo data store initialization error: %O', result.error)
        return result
      }
      cartographer.value = newCartographer

      const latestParams = parameterStore.globalEffectiveParameters
      if (latestParams && Object.keys(latestParams).length > 0) {
        cartographer.value.updateProjectionParams(latestParams)
        debug('Updated cartographer with latest params after init: %O', latestParams)
      }

      const cartographerId = Date.now()

      debug('Cartographer created (id: %d, atlas: %s, territories: %d)', cartographerId, atlasConfig.id, Object.keys(compositeConfig || {}).length)
      isInitialized.value = true
      return ok(undefined)
    }
    finally {
      isLoading.value = false
    }
  }

  const reloadUnifiedData = async (territoryMode: string) => {
    const atlasStore = useAtlasStore()

    // loadAllAtlasData loads the current mode once the initialization ends
    const loadingCartographer = cartographer.value
    if (!loadingCartographer) {
      return
    }
    if (!atlasStore.currentAtlasConfig) {
      throw new Error('Cannot reload unified data: Atlas config not loaded')
    }

    try {
      isLoading.value = true
      error.value = null

      const service = loadingCartographer.geoData
      const loader = TerritoryDataLoader.create()
      const result = await loader.loadUnifiedData(service, territoryMode, {
        atlasConfig: atlasStore.currentAtlasConfig,
        atlasService: atlasStore.atlasService,
        hasTerritorySelector: atlasStore.currentAtlasConfig.hasTerritorySelector ?? false,
        isWildcard: atlasStore.currentAtlasConfig.isWildcard ?? false,
      })

      if (cartographer.value !== loadingCartographer) {
        return
      }

      rawUnifiedData.value = result.data
      debug('Reloaded unified data for mode: %s', territoryMode)
    }
    finally {
      isLoading.value = false
    }
  }

  const loadAllAtlasData = async (territoryMode: string): Promise<Result<void, GeoDataError>> => {
    // A later reinitialization can replace the one awaited here
    let pending = pendingInitialization
    while (!cartographer.value && pending) {
      const result = await pending
      if (!result.ok) {
        return result
      }
      pending = pendingInitialization
    }

    if (!cartographer.value) {
      const result = await initialize()
      if (!result.ok) {
        return result
      }
    }

    const loadingCartographer = cartographer.value
    if (!loadingCartographer) {
      throw new Error('Cartographer not initialized')
    }

    const atlasStore = useAtlasStore()
    if (!atlasStore.currentAtlasConfig) {
      throw new Error('Atlas config not loaded')
    }

    try {
      isLoading.value = true
      error.value = null

      debug('Preloading all data types for atlas: %s', atlasStore.currentAtlasConfig.id)

      await Promise.all([
        (async () => {
          const service = loadingCartographer.geoData
          const loader = TerritoryDataLoader.create()
          const result = await loader.loadTerritories(service)

          if (cartographer.value === loadingCartographer) {
            territoriesData.value = result.territories
            debug('Loaded %d territories', result.territories.length)
          }
        })(),

        (async () => {
          const service = loadingCartographer.geoData
          const loader = TerritoryDataLoader.create()
          const result = await loader.loadUnifiedData(service, territoryMode, {
            atlasConfig: atlasStore.currentAtlasConfig!,
            atlasService: atlasStore.atlasService,
            hasTerritorySelector: atlasStore.currentAtlasConfig!.hasTerritorySelector ?? false,
            isWildcard: atlasStore.currentAtlasConfig!.isWildcard ?? false,
          })

          if (cartographer.value === loadingCartographer) {
            rawUnifiedData.value = result.data
            debug('Loaded unified data')
          }
        })(),
      ])

      debug('All atlas data preloaded successfully')
      return ok(undefined)
    }
    finally {
      isLoading.value = false
    }
  }

  const clearAllData = () => {
    debug('Clearing all geodata')
    territoriesData.value = []
    rawUnifiedData.value = null
    error.value = null
  }

  const clearError = () => {
    error.value = null
  }

  const failInitialization = (failure: InitializationError) => {
    error.value ??= failure
  }

  const reinitialize = async (atlasConfigOverride?: any): Promise<Result<void, GeoDataError>> => {
    debug('Reinitializing - resetting state and reloading data (override: %s)', !!atlasConfigOverride)

    isInitialized.value = false
    territoriesData.value = []
    rawUnifiedData.value = null

    const oldCartographer = cartographer.value
    cartographer.value = null
    if (oldCartographer) {
      debug('Cleared existing cartographer instance')
    }

    const generation = ++initializationGeneration
    const pending = initialize(atlasConfigOverride, generation).finally(() => {
      if (generation === initializationGeneration) {
        pendingInitialization = null
      }
    })
    pendingInitialization = pending

    return pending
  }

  const triggerRender = () => {
    debug('triggerRender() - renderKey: %d → %d', renderKey.value, renderKey.value + 1)
    renderKey.value++
  }

  const setReinitializing = (value: boolean) => {
    isReinitializing.value = value
  }

  async function getFilteredRawData(): Promise<GeoJSON.FeatureCollection | null> {
    if (!cartographer.value) {
      return null
    }
    const territoryCodes = filteredTerritories.value.map(territory => territory.code)
    const viewStore = useViewStore()
    return cartographer.value.geoData.getRawUnifiedData(viewStore.territoryMode, territoryCodes)
  }

  function exportConfiguration(): Result<CompositeProjectionConfig, ExportError> {
    const customComposite = cartographer.value?.customComposite
    const atlasConfig = useAtlasStore().currentAtlasConfig
    if (!customComposite || !atlasConfig?.compositeTerritories) {
      return err({ code: 'EXPORT_NOT_AVAILABLE' })
    }

    const projectionStore = useProjectionStore()
    return ok(CompositeExportService.exportToJSON(
      // The ref unwraps the private fields of the class out of its type
      customComposite as CompositeProjection,
      atlasConfig.id as AtlasId,
      resolveI18nValue(atlasConfig.name, i18n.global.locale.value),
      useParameterStore().parameterProvider,
      projectionStore.referenceScale ?? DEFAULT_REFERENCE_SCALE,
      projectionStore.canvasDimensions ?? DEFAULT_CANVAS_DIMENSIONS,
    ))
  }

  return {
    cartographer,

    isLoading,
    error,
    isInitialized,
    isReinitializing,
    territoriesData,
    rawUnifiedData,
    renderKey, // Expose render key for components to watch

    filteredTerritories,
    allActiveTerritories,

    reinitialize,
    setReinitializing,
    reloadUnifiedData,
    loadAllAtlasData,
    clearAllData,
    clearError,
    failInitialization,
    getFilteredRawData,
    exportConfiguration,
    triggerRender, // Expose method to force re-render
  }
})
