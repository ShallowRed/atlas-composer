import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { Preset, UnifiedViewConfig } from '@/core/presets'
import type { TerritoryResetOperation } from '@/core/territories/types'
import type { GeoDataError, ImportError, PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { ProjectionId, TerritoryCode, ViewMode } from '@/types'
import type { PresetId } from '@/types/branded'
import type {
  ApplicationState,
  AtlasInitializationOptions,
  InitializationResult,
  PresetLoadOptions,
} from '@/types/initialization'

import { defineStore } from 'pinia'
import { nextTick, watch } from 'vue'
import { getAtlasConfig, getAvailableViewModes, getDefaultPresetForViewMode, getDefaultViewMode } from '@/core/atlases/registry'
import { filterAtlasConfigByPreset, getInitialTerritoryMode } from '@/core/atlases/utils'
import { checkAtlasCompatibility, convertToDefaults, extractTerritoryParameters } from '@/core/presets'
import { findPositioningErrors, findTerritoriesWithoutProjection } from '@/core/presets/validator'
import { DEFAULT_CANVAS_DIMENSIONS } from '@/core/projections/defaults'
import { TerritoryDefaultsService } from '@/core/territories/territory-defaults-service'
import { TerritoryResetService } from '@/core/territories/territory-reset-service'
import { err, ok } from '@/core/types/result'
import { AtlasService } from '@/services/atlas/atlas-service'
import { CompositeImportService } from '@/services/export/composite-import-service'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { PresetValidationService } from '@/services/validation/preset-validation-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.store.config

function geoDataFailure(error: GeoDataError): string {
  return `Failed to load geographic data: ${error.code}`
}

function failureReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function presetFailure(error: PresetError): string {
  if (error.code === 'PRESET_INVALID') {
    return error.issues.map(({ code, ...fields }) => `${code} ${JSON.stringify(fields)}`).join(', ')
  }
  return `${error.code}: ${'path' in error ? error.path : error.presetId}`
}

// Use cases that write several stores. It imports the other stores: a store that
// imports it forms a cycle, which knip --cycles refuses.
export const useCompositionStore = defineStore('composition', () => {
  const appStore = useAppStore()
  const atlasStore = useAtlasStore()
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const presetDefaults = usePresetDefaultsStore()
  const projectionStore = useProjectionStore()
  const uiStore = useUIStore()
  const viewStore = useViewStore()

  async function startMapView(): Promise<void> {
    geoDataStore.clearError()
    uiStore.initializeTheme()

    const result = await initializeAtlas()

    if (!result.success) {
      geoDataStore.failInitialization(result.errors.join(', '))
      debug('Initialization error: %O', result.errors)
    }
  }

  async function initializeAtlas(
    options: AtlasInitializationOptions = {},
  ): Promise<InitializationResult> {
    const { preserveViewMode = false } = options
    const atlasId = atlasStore.selectedAtlasId

    // Every failure resets the loading state and records the error
    const fail = (errors: string[]): InitializationResult => {
      geoDataStore.setReinitializing(false)
      appStore.setError(errors.join(', '))
      return { success: false, errors, warnings: [] }
    }

    try {
      const loadedAtlas = await atlasStore.loadAtlas(atlasId)
      if (!loadedAtlas.ok) {
        return fail([loadedAtlas.error.code])
      }

      const atlasConfig = getAtlasConfig(atlasId)
      const atlasService = new AtlasService(atlasId)

      const currentViewMode = viewStore.viewMode as ViewMode
      const availableViewModes = getAvailableViewModes(atlasId)
      const viewMode = preserveViewMode && availableViewModes.includes(currentViewMode)
        ? currentViewMode
        : getDefaultViewMode(atlasId)

      const territoryMode = getInitialTerritoryMode(atlasConfig)

      appStore.startLoadingAtlas()
      geoDataStore.setReinitializing(true)
      await clearAllApplicationData()

      let preset: Preset | null = null
      let territoryDefaults = TerritoryDefaultsService.initializeAll(
        atlasService.getAllTerritories(),
        'mercator' as ProjectionId,
      )
      let territoryParameters: Record<string, Record<string, unknown>> = {}
      let referenceScale: number | undefined
      let canvasDimensions: { width: number, height: number } | undefined

      const defaultPresetDef = getDefaultPresetForViewMode(atlasId, viewMode)
      const defaultPresetId = defaultPresetDef?.id as PresetId | undefined

      if (viewMode === 'composite-custom') {
        if (!defaultPresetId) {
          return fail([`No default preset defined for atlas '${atlasId}' in composite-custom mode`])
        }

        const presetResult = await PresetLoader.loadPreset(defaultPresetId)

        if (!presetResult.ok) {
          return fail([`Failed to load default preset '${defaultPresetId}': ${presetFailure(presetResult.error)}`])
        }

        preset = presetResult.value

        if (preset.type === 'composite-custom') {
          territoryDefaults = convertToDefaults(preset.config)
          territoryParameters = extractTerritoryParameters(preset.config)
          referenceScale = preset.config.referenceScale
          canvasDimensions = preset.config.canvasDimensions
        }
      }
      else if (['unified', 'split', 'built-in-composite'].includes(viewMode)) {
        if (!defaultPresetId) {
          return fail([`No default preset defined for atlas '${atlasId}' in ${viewMode} mode`])
        }

        const presetResult = await PresetLoader.loadPreset(defaultPresetId)

        if (!presetResult.ok) {
          return fail([`Failed to load default preset '${defaultPresetId}': ${presetFailure(presetResult.error)}`])
        }

        preset = presetResult.value

        if (preset.type !== viewMode) {
          return fail([`Default preset '${defaultPresetId}' has type '${preset.type}' but expected '${viewMode}'`])
        }

        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.ok) {
          return fail([presetFailure(validation.error)])
        }
      }

      let atlasParameters: Record<string, unknown> = {}
      if (viewMode === 'unified' && preset?.type === 'unified') {
        const unifiedConfig = preset.config as UnifiedViewConfig
        if (unifiedConfig.projection?.parameters) {
          atlasParameters = { ...unifiedConfig.projection.parameters }
        }
      }

      const compositeProjection = await AtlasMetadataService.getDefaultCompositeProjection(atlasId, defaultPresetId)
      const selectedProjection = await AtlasMetadataService.getRecommendedProjection(atlasId, defaultPresetId)
      const state: ApplicationState = {
        atlas: {
          id: atlasId,
          config: atlasConfig,
        },
        viewMode,
        territoryMode,
        preset: preset
          ? {
              id: defaultPresetId as PresetId,
              type: preset.type,
              data: preset,
            }
          : null,
        projections: {
          selected: selectedProjection,
          composite: compositeProjection,
        },
        parameters: {
          global: atlasParameters,
          territories: territoryParameters as any,
        },
        territories: {
          projections: territoryDefaults.projections,
          translations: territoryDefaults.translations,
          scales: territoryDefaults.scales,
        },
        canvas: {
          referenceScale,
          dimensions: canvasDimensions,
        },
        display: {
          showGraticule: false,
          showCompositionBorders: true,
          showMapLimits: true,
        },
      }

      const filteredAtlasConfig = filterAtlasConfigByPreset(atlasConfig, state.parameters.territories)
      debug('Filtered atlas config for %s: %d preset territories', atlasId, Object.keys(state.parameters.territories).length)

      await applyStateToStores(state)

      await nextTick()

      const validationErrors = findTerritoriesWithoutProjection(
        filteredAtlasConfig,
        state.parameters.territories,
        state.viewMode,
      )
      if (validationErrors.length > 0) {
        return fail(validationErrors)
      }

      const projectionValidationErrors = findPositioningErrors(state.parameters.territories)
      if (projectionValidationErrors.length > 0) {
        return fail(projectionValidationErrors)
      }

      appStore.startLoadingGeoData()
      const geoDataResult = await geoDataStore.reinitialize(filteredAtlasConfig)
      if (!geoDataResult.ok) {
        return fail([geoDataFailure(geoDataResult.error)])
      }

      const preloadResult = await preloadAtlasData(territoryMode)
      if (!preloadResult.ok) {
        return fail([geoDataFailure(preloadResult.error)])
      }
      geoDataStore.setReinitializing(false)
      appStore.setReady()
      geoDataStore.triggerRender()

      return {
        success: true,
        errors: [],
        warnings: [],
      }
    }
    catch (error) {
      return fail([error instanceof Error ? error.message : 'Unknown error during atlas initialization'])
    }
  }

  async function loadPreset(options: PresetLoadOptions): Promise<InitializationResult> {
    const { presetId, skipValidation = false } = options

    try {
      appStore.startLoadingPreset()

      const currentAtlasId = atlasStore.selectedAtlasId
      const atlasConfig = getAtlasConfig(currentAtlasId)
      const presetResult = await PresetLoader.loadPreset(presetId)
      if (!presetResult.ok) {
        appStore.setReady()
        return {
          success: false,
          errors: [`Failed to load preset '${presetId}': ${presetFailure(presetResult.error)}`],
          warnings: [],
        }
      }

      const preset = presetResult.value

      if (!skipValidation) {
        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.ok) {
          appStore.setReady()
          return {
            success: false,
            errors: [presetFailure(validation.error)],
            warnings: [],
          }
        }
      }

      if (preset.type !== 'composite-custom') {
        appStore.setReady()
        return {
          success: true,
          errors: [],
          warnings: [],
        }
      }

      const territoryDefaults = convertToDefaults(preset.config)
      const territoryParameters = extractTerritoryParameters(preset.config)

      const state: ApplicationState = {
        atlas: {
          id: currentAtlasId,
          config: atlasConfig,
        },
        viewMode: 'composite-custom',
        territoryMode: viewStore.territoryMode,
        preset: {
          id: presetId,
          type: preset.type,
          data: preset,
        },
        projections: {
          selected: projectionStore.selectedProjection,
          composite: projectionStore.compositeProjection,
        },
        parameters: {
          global: {},
          territories: territoryParameters as any,
        },
        territories: {
          projections: territoryDefaults.projections,
          translations: territoryDefaults.translations,
          scales: territoryDefaults.scales,
        },
        canvas: {
          referenceScale: preset.config.referenceScale,
          dimensions: preset.config.canvasDimensions,
        },
        display: {
          showGraticule: false,
          showCompositionBorders: true,
          showMapLimits: true,
        },
      }

      await applyStateToStores(state)
      const geoDataResult = await ensureAtlasDataLoaded(viewStore.territoryMode)
      if (!geoDataResult.ok) {
        const message = geoDataFailure(geoDataResult.error)
        appStore.setError(message)
        return {
          success: false,
          errors: [message],
          warnings: [],
        }
      }
      appStore.setReady()

      // The stores hold the preset: a rendering failure leaves the application ready
      try {
        updateCartographer(state)
      }
      catch (error) {
        return {
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
        }
      }

      return {
        success: true,
        errors: [],
        warnings: [],
      }
    }
    catch (error) {
      appStore.setError(error instanceof Error ? error.message : 'Unknown error')
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during preset loading'],
        warnings: [],
      }
    }
  }

  function updateCartographer(state: ApplicationState): void {
    const cartographer = geoDataStore.cartographer
    if (!cartographer) {
      return
    }

    const territoryCodes = Object.keys(state.parameters.territories) as TerritoryCode[]
    const compositeProjectionConfig = atlasStore.currentAtlasConfig?.compositeProjectionConfig
    if (!compositeProjectionConfig) {
      updateCartographerTerritories(territoryCodes)
      return
    }

    cartographer.rebuildCompositeProjection(
      compositeProjectionConfig,
      parameterStore.parameterProvider,
      state.canvas.referenceScale,
    )
    debug('Rebuilt composite projection with %d territories', territoryCodes.length)
    geoDataStore.triggerRender()
  }

  function updateCartographerTerritories(territoryCodes: TerritoryCode[]): void {
    const cartographer = geoDataStore.cartographer
    if (!cartographer) {
      return
    }

    territoryCodes.forEach(code => cartographer.updateTerritoryParameters(code))
    debug('Updated cartographer for %d territories', territoryCodes.length)
    geoDataStore.triggerRender()
  }

  async function readConfigurationFile(file: File): Promise<Result<CompositeProjectionConfig, ImportError>> {
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig || atlasConfig.id !== atlasStore.selectedAtlasId) {
      return err({ code: 'IMPORT_ATLAS_NOT_LOADED' })
    }

    const read = await CompositeImportService.importFromFile(file, {
      atlasConfig,
      canvasDimensions: projectionStore.canvasDimensions ?? DEFAULT_CANVAS_DIMENSIONS,
    })
    if (!read.ok) {
      return read
    }

    const compatibility = checkAtlasCompatibility(read.value, atlasConfig.id)
    return compatibility.ok ? read : compatibility
  }

  async function importConfiguration(config: CompositeProjectionConfig): Promise<Result<void, ImportError>> {
    try {
      const currentAtlasId = atlasStore.selectedAtlasId
      const atlasConfig = getAtlasConfig(currentAtlasId)

      const territoryParameters: Record<string, Record<string, unknown>> = {}
      for (const territory of config.territories) {
        const params: Record<string, unknown> = {
          ...territory.projection.parameters,
          translateOffset: territory.layout.translateOffset,
        }

        if (territory.layout.pixelClipExtent) {
          params.pixelClipExtent = territory.layout.pixelClipExtent
        }

        territoryParameters[territory.code] = params
      }

      const state: ApplicationState = {
        atlas: {
          id: currentAtlasId,
          config: atlasConfig,
        },
        viewMode: 'composite-custom',
        territoryMode: viewStore.territoryMode,
        preset: null, // Imported config is not a saved preset
        projections: {
          selected: projectionStore.selectedProjection,
          composite: projectionStore.compositeProjection,
        },
        parameters: {
          global: {},
          territories: territoryParameters as any,
        },
        territories: convertToDefaults(config),
        canvas: {
          referenceScale: config.referenceScale,
          dimensions: config.canvasDimensions,
        },
        display: {
          showGraticule: false,
          showCompositionBorders: true,
          showMapLimits: true,
        },
      }

      await applyStateToStores(state)

      const geoDataResult = await ensureAtlasDataLoaded(viewStore.territoryMode)
      if (!geoDataResult.ok) {
        return geoDataResult
      }

      updateCartographerTerritories(config.territories.map(territory => territory.code as TerritoryCode))
      return ok(undefined)
    }
    catch (error) {
      return err({ code: 'IMPORT_APPLICATION_FAILED', reason: failureReason(error) })
    }
  }

  function resetTransforms(): void {
    const operation = TerritoryResetService.calculateBulkReset({
      territories: atlasStore.atlasService.getAllTerritories(),
      presetDefaults: presetDefaults.territoryDefaults ?? undefined,
      presetParameters: presetDefaults.presetParameters,
    })

    operation.operations.forEach(resetTerritory)

    if (operation.activeTerritories) {
      viewStore.setActiveTerritories(operation.activeTerritories)
    }

    const strategy = operation.activeTerritories ? 'preset' : 'fallback'
    debug(`Reset all territories using ${strategy} strategy`)
  }

  function resetTerritoryToDefaults(territoryCode: TerritoryCode): void {
    const operation = TerritoryResetService.calculateTerritoryReset({
      territoryCode,
      presetDefaults: presetDefaults.territoryDefaults ?? undefined,
      presetParameters: presetDefaults.presetParameters,
    })

    resetTerritory(operation)

    const strategy = operation.projection ? 'preset' : 'fallback'
    debug(`Reset territory ${territoryCode} using ${strategy} strategy`)
  }

  function resetTerritory(operation: TerritoryResetOperation): void {
    const { territoryCode: code, projection, translation, scale, parameters, shouldClearOverrides } = operation

    if (shouldClearOverrides) {
      parameterStore.clearAllTerritoryOverrides(code)
    }

    if (projection) {
      parameterStore.setTerritoryProjection(code, projection)
    }

    parameterStore.setTerritoryTranslation(code, 'x', translation.x)
    parameterStore.setTerritoryTranslation(code, 'y', translation.y)

    parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)

    if (parameters) {
      parameterStore.setTerritoryParameters(code, parameters as any)
    }

    if (geoDataStore.cartographer) {
      if (projection) {
        geoDataStore.cartographer.updateTerritoryProjection(code, projection)
      }
      geoDataStore.cartographer.updateTerritoryParameters(code)
    }
  }

  async function applyStateToStores(state: ApplicationState): Promise<void> {
    atlasStore.selectedAtlasId = state.atlas.id

    viewStore.viewMode = state.viewMode as ViewMode
    viewStore.territoryMode = state.territoryMode

    projectionStore.selectedProjection = state.projections.selected
    if (state.projections.composite) {
      projectionStore.compositeProjection = state.projections.composite
    }
    if (state.canvas.referenceScale !== undefined) {
      projectionStore.referenceScale = state.canvas.referenceScale
    }
    if (state.canvas.dimensions !== undefined) {
      projectionStore.canvasDimensions = state.canvas.dimensions
    }

    const territoryCodes = Object.keys(state.parameters.territories) as TerritoryCode[]
    viewStore.setActiveTerritories(territoryCodes)

    if (state.parameters.global && Object.keys(state.parameters.global).length > 0) {
      parameterStore.setAtlasParameters(state.parameters.global as any)
      presetDefaults.storeGlobalParameters(state.parameters.global as any)
    }

    if (state.parameters.territories && Object.keys(state.parameters.territories).length > 0) {
      const validationErrors = parameterStore.initializeFromPreset(
        {} as any, // Atlas params already set above
        state.parameters.territories as any,
      )

      if (validationErrors.length > 0) {
        debug('Parameter validation warnings: %O', validationErrors)
      }
    }

    for (const [code, projection] of Object.entries(state.territories.projections)) {
      parameterStore.setTerritoryProjection(code as TerritoryCode, projection as ProjectionId)
    }
    for (const [code, translation] of Object.entries(state.territories.translations)) {
      parameterStore.setTerritoryTranslation(code as TerritoryCode, 'x', translation.x)
      parameterStore.setTerritoryTranslation(code as TerritoryCode, 'y', translation.y)
    }
    for (const [code, scale] of Object.entries(state.territories.scales)) {
      parameterStore.setTerritoryParameter(code as TerritoryCode, 'scaleMultiplier', scale)
    }

    uiStore.showGraticule = state.display.showGraticule
    uiStore.showCompositionBorders = state.display.showCompositionBorders
    uiStore.showMapLimits = state.display.showMapLimits

    if (state.viewMode === 'composite-custom' || state.viewMode === 'split') {
      presetDefaults.storePresetDefaults(
        state.territories,
        state.parameters.territories as any,
      )
    }
  }

  async function clearAllApplicationData(): Promise<void> {
    debug('Clearing all application data')
    parameterStore.clearAll()
    geoDataStore.clearAllData()
    presetDefaults.clearAll()
  }

  async function preloadAtlasData(territoryMode: string): Promise<Result<void, GeoDataError>> {
    debug('Preloading all atlas data types')
    return geoDataStore.loadAllAtlasData(territoryMode)
  }

  async function ensureAtlasDataLoaded(territoryMode: string): Promise<Result<void, GeoDataError>> {
    const hasTerritoryData = geoDataStore.territoriesData.length > 0
    const hasUnifiedData = geoDataStore.rawUnifiedData !== null

    if (hasTerritoryData && hasUnifiedData) {
      debug('Atlas data already loaded, skipping preload')
      return ok(undefined)
    }

    debug('Atlas data not fully loaded, preloading...')
    return preloadAtlasData(territoryMode)
  }

  watch(() => viewStore.viewMode, async (newMode, oldMode) => {
    viewStore.clearViewPreset()

    parameterStore.setGlobalParameters({ rotate: undefined, center: undefined })
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)
    presetDefaults.storeGlobalParameters(null)

    if (newMode !== 'composite-custom' && newMode !== 'split') {
      presetDefaults.clearAll()
    }

    await viewStore.loadAvailableViewPresets()

    if (newMode === 'composite-custom' && viewStore.availableViewPresets.length === 0) {
      debug('Reloading default composite preset for composite-custom mode')
      // Called through the store, so that a spy on the store sees the call
      await useCompositionStore().initializeAtlas({
        preserveViewMode: true, // Keep composite-custom mode
      })
    }
    else {
      await viewStore.autoLoadFirstPreset(`view mode changed from ${oldMode} to ${newMode}`)
    }
  })

  let isReverting = false

  async function switchAtlas(reason: string) {
    const result = await useCompositionStore().initializeAtlas({
      preserveViewMode: true,
    })

    if (result.success) {
      await viewStore.loadAvailableViewPresets()
      await viewStore.autoLoadFirstPreset(reason)
    }

    return result
  }

  watch(() => atlasStore.selectedAtlasId, async (newAtlasId, oldAtlasId) => {
    if (isReverting) {
      isReverting = false
      return
    }

    const result = await switchAtlas(`atlas changed from ${oldAtlasId} to ${newAtlasId}`)

    if (result.success) {
      debug('Atlas changed: %s -> %s', oldAtlasId, newAtlasId)
      return
    }

    debug('Atlas change failed: %O', result.errors)

    isReverting = true
    atlasStore.selectedAtlasId = oldAtlasId

    uiStore.showToast(
      `Cannot switch to ${newAtlasId}: ${result.errors[0] ?? 'Failed to switch atlas'}`,
      'error',
      5000,
    )

    // The failed initialization cleared the data of the previous atlas
    const restored = await switchAtlas(`atlas restored after failing to load ${newAtlasId}`)
    if (!restored.success) {
      debug('Atlas restore failed: %O', restored.errors)
    }
  })

  return {
    startMapView,
    initializeAtlas,
    loadPreset,
    readConfigurationFile,
    importConfiguration,
    resetTransforms,
    resetTerritoryToDefaults,
  }
})
