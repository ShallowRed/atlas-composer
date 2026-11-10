import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { Preset, UnifiedViewConfig } from '@/core/presets'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { TerritoryResetOperation } from '@/core/territories/types'
import type { GeoDataError, ImportError, InitializationError, PresetApplicationError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { SharedLink } from '@/core/view'
import type { AtlasId, ProjectionId, TerritoryCode, ViewMode } from '@/types'
import type { PresetId } from '@/types/branded'
import type {
  ApplicationState,
  AtlasInitializationOptions,
  PresetLoadOptions,
} from '@/types/initialization'

import { defineStore } from 'pinia'
import { getAtlasConfig, getAvailableViewModes, getDefaultPresetForViewMode, getDefaultViewMode } from '@/core/atlases/registry'
import { filterAtlasConfigByPreset, getInitialTerritoryMode } from '@/core/atlases/utils'
import { parameterRegistry } from '@/core/parameters'
import { checkAtlasCompatibility, convertToDefaults, extractTerritoryParameters } from '@/core/presets'
import { DEFAULT_CANVAS_DIMENSIONS, FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { projectionRegistry } from '@/core/projections/registry'
import { TerritoryDefaultsService } from '@/core/territories/territory-defaults-service'
import { referenceParameters, TerritoryResetService } from '@/core/territories/territory-reset-service'
import { err, ok } from '@/core/types/result'
import { DEFAULT_SELECTED_PROJECTION } from '@/core/view'
import { AtlasService } from '@/services/atlas/atlas-service'
import { CompositeImportService } from '@/services/export/composite-import-service'
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

function failureReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
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

  let initializationRun = 0

  async function startMapView(sharedLink?: SharedLink): Promise<void> {
    geoDataStore.clearError()
    uiStore.initializeTheme()

    if (sharedLink?.atlas) {
      atlasStore.selectedAtlasId = sharedLink.atlas
    }
    if (sharedLink?.view) {
      viewStore.viewMode = sharedLink.view
    }

    const result = await initializeAtlas({
      preserveViewMode: sharedLink?.view !== undefined,
      sharedLink,
    })

    if (!result.ok) {
      geoDataStore.failInitialization(result.error)
      debug('Initialization error: %O', result.error)
    }
  }

  async function initializeAtlas(
    options: AtlasInitializationOptions = {},
  ): Promise<Result<void, InitializationError>> {
    const { preserveViewMode = false, sharedLink } = options
    const atlasId = atlasStore.selectedAtlasId
    const run = ++initializationRun
    const isSuperseded = () => run !== initializationRun

    const fail = (error: InitializationError): Result<void, InitializationError> => {
      geoDataStore.setReinitializing(false)
      appStore.setFailed()
      return err(error)
    }

    try {
      const loadedAtlas = await atlasStore.loadAtlas(atlasId)
      if (isSuperseded()) {
        return ok(undefined)
      }
      if (!loadedAtlas.ok) {
        return fail(loadedAtlas.error)
      }

      const atlasConfig = getAtlasConfig(atlasId)
      const atlasService = new AtlasService(atlasId)

      const currentViewMode = viewStore.viewMode as ViewMode
      const availableViewModes = getAvailableViewModes(atlasId)
      const viewMode = preserveViewMode && availableViewModes.includes(currentViewMode)
        ? currentViewMode
        : getDefaultViewMode(atlasId)

      const linkTerritoryMode = sharedLink?.territoryMode
      const territoryMode = linkTerritoryMode && atlasConfig.territoryModeOptions?.some(option => option.value === linkTerritoryMode)
        ? linkTerritoryMode
        : getInitialTerritoryMode(atlasConfig)

      appStore.startLoadingAtlas()
      geoDataStore.setReinitializing(true)
      clearAllApplicationData()

      let preset: Preset | null = null
      let territoryDefaults = TerritoryDefaultsService.initializeAll(
        atlasService.getAllTerritories(),
        FALLBACK_PROJECTION_ID,
      )
      let territoryParameters: Record<string, Record<string, unknown>> = {}
      let referenceScale: number | undefined
      let canvasDimensions: { width: number, height: number } | undefined

      const defaultPresetDef = getDefaultPresetForViewMode(atlasId, viewMode)
      const defaultPresetId = defaultPresetDef?.id as PresetId | undefined

      if (viewMode === 'composite-custom') {
        if (!defaultPresetId) {
          return fail({ code: 'ATLAS_NO_DEFAULT_PRESET', atlasId, viewMode })
        }

        const presetResult = await PresetLoader.loadPreset(defaultPresetId)
        if (isSuperseded()) {
          return ok(undefined)
        }

        if (!presetResult.ok) {
          return fail(presetResult.error)
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
          return fail({ code: 'ATLAS_NO_DEFAULT_PRESET', atlasId, viewMode })
        }

        const presetResult = await PresetLoader.loadPreset(defaultPresetId)
        if (isSuperseded()) {
          return ok(undefined)
        }

        if (!presetResult.ok) {
          return fail(presetResult.error)
        }

        preset = presetResult.value

        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.ok) {
          return fail(validation.error)
        }
      }

      let atlasParameters: Record<string, unknown> = {}
      if (viewMode === 'unified' && preset?.type === 'unified') {
        const unifiedConfig = preset.config as UnifiedViewConfig
        if (unifiedConfig.projection?.parameters) {
          atlasParameters = { ...unifiedConfig.projection.parameters }
        }
      }

      const state: ApplicationState = {
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
          selected: DEFAULT_SELECTED_PROJECTION[viewMode],
          composite: atlasConfig.projectionPreferences?.defaultCompositeProjection,
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

      applyStateToStores(state)

      viewStore.clearViewPreset()
      await viewStore.loadAvailableViewPresets()
      await viewStore.autoLoadFirstPreset(`initialization of ${atlasId}`)
      if (isSuperseded()) {
        return ok(undefined)
      }

      if (sharedLink) {
        applySharedLink(sharedLink)
      }

      appStore.startLoadingGeoData()
      const geoDataResult = await geoDataStore.reinitialize(filteredAtlasConfig)
      if (isSuperseded()) {
        return ok(undefined)
      }
      if (!geoDataResult.ok) {
        return fail(geoDataResult.error)
      }

      const preloadResult = await preloadAtlasData(territoryMode)
      if (isSuperseded()) {
        return ok(undefined)
      }
      if (!preloadResult.ok) {
        return fail(preloadResult.error)
      }
      geoDataStore.setReinitializing(false)
      appStore.setReady()
      geoDataStore.triggerRender()

      return ok(undefined)
    }
    catch (error) {
      if (isSuperseded()) {
        return ok(undefined)
      }
      return fail({ code: 'INITIALIZATION_FAILED', reason: failureReason(error) })
    }
  }

  async function loadPreset(options: PresetLoadOptions): Promise<Result<void, PresetApplicationError>> {
    const { presetId, skipValidation = false } = options
    const currentAtlasId = atlasStore.selectedAtlasId
    const isAtlasChanged = () => atlasStore.selectedAtlasId !== currentAtlasId

    try {
      appStore.startLoadingPreset()

      const atlasConfig = getAtlasConfig(currentAtlasId)
      const presetResult = await PresetLoader.loadPreset(presetId)
      if (isAtlasChanged()) {
        return ok(undefined)
      }
      if (viewStore.viewMode !== 'composite-custom') {
        appStore.setReady()
        return ok(undefined)
      }

      if (!presetResult.ok) {
        appStore.setReady()
        return presetResult
      }

      const preset = presetResult.value

      if (!skipValidation) {
        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.ok) {
          appStore.setReady()
          return validation
        }
      }

      if (preset.type !== 'composite-custom') {
        appStore.setReady()
        return ok(undefined)
      }

      const territoryDefaults = convertToDefaults(preset.config)
      const territoryParameters = extractTerritoryParameters(preset.config)

      const state: ApplicationState = {
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

      parameterStore.clearAll()
      applyStateToStores(state)
      const geoDataResult = await ensureAtlasDataLoaded(viewStore.territoryMode)
      if (isAtlasChanged()) {
        return ok(undefined)
      }

      if (!geoDataResult.ok) {
        appStore.setFailed()
        return geoDataResult
      }
      appStore.setReady()

      // The stores hold the preset: a rendering failure leaves the application ready
      try {
        updateCartographer(state)
      }
      catch (error) {
        return err({ code: 'PRESET_APPLICATION_FAILED', presetId, reason: failureReason(error) })
      }

      return ok(undefined)
    }
    catch (error) {
      if (isAtlasChanged()) {
        return ok(undefined)
      }
      appStore.setFailed()
      return err({ code: 'PRESET_APPLICATION_FAILED', presetId, reason: failureReason(error) })
    }
  }

  function updateCartographer(state: ApplicationState): void {
    const cartographer = geoDataStore.cartographer
    if (!cartographer) {
      return
    }

    const compositeProjectionConfig = atlasStore.currentAtlasConfig?.compositeProjectionConfig
    if (!compositeProjectionConfig) {
      geoDataStore.triggerRender()
      return
    }

    cartographer.rebuildCompositeProjection(
      compositeProjectionConfig,
      parameterStore.parameterProvider,
      state.canvas.referenceScale,
    )
    debug('Rebuilt composite projection')
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
    const currentAtlasId = atlasStore.selectedAtlasId
    const isAtlasChanged = () => atlasStore.selectedAtlasId !== currentAtlasId

    try {
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

      parameterStore.clearAll()
      applyStateToStores(state)

      const geoDataResult = await ensureAtlasDataLoaded(viewStore.territoryMode)
      if (isAtlasChanged()) {
        return ok(undefined)
      }

      if (!geoDataResult.ok) {
        return geoDataResult
      }

      updateCartographer(state)
      return ok(undefined)
    }
    catch (error) {
      if (isAtlasChanged()) {
        return ok(undefined)
      }
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
    if (operation.shouldClearOverrides) {
      parameterStore.clearAllTerritoryOverrides(operation.territoryCode)
    }
    parameterStore.setTerritoryParameters(operation.territoryCode, referenceParameters(operation))
  }

  function applyStateToStores(state: ApplicationState): void {
    viewStore.viewMode = state.viewMode as ViewMode
    viewStore.territoryMode = state.territoryMode

    projectionStore.selectedProjection = state.projections.selected
    projectionStore.compositeProjection = state.projections.composite ?? null
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
      parameterStore.initializeFromPreset(
        {} as any, // Atlas params already set above
        state.parameters.territories as any,
      )
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

    if (state.viewMode === 'composite-custom') {
      presetDefaults.storePresetDefaults(
        state.territories,
        state.parameters.territories as any,
      )
    }
  }

  function familyOf(projectionId: string | null | undefined): ProjectionFamilyType {
    return projectionRegistry.get(projectionId ?? '')?.family ?? 'MISCELLANEOUS'
  }

  function applySharedLink(link: SharedLink): void {
    const isProposed = viewStore.projectionGroups.some(group => group.options?.some(option => option.value === link.projection))
    if (link.projection && isProposed) {
      projectionStore.setSelectedProjection(link.projection)
    }

    const selectedProjection = projectionStore.selectedProjection
    if (link.rotate && parameterRegistry.validate('rotate', link.rotate, familyOf(selectedProjection)).ok) {
      const [longitude, latitude, gamma] = link.rotate
      projectionStore.setCustomRotate({ longitude, latitude, gamma })
    }
    // Checked as conic, since the parallels apply as soon as a conic projection is selected
    if (link.parallels && parameterRegistry.validate('parallels', link.parallels, 'CONIC').ok) {
      parameterStore.setGlobalParameter('parallels', link.parallels)
    }

    const atlasTerritories = new Set<string>(atlasStore.atlasService.getAllTerritories().map(territory => territory.code))
    for (const [territory, { scale, translation }] of link.territories) {
      if (!atlasTerritories.has(territory)) {
        continue
      }

      const code = territory as TerritoryCode
      const family = familyOf(parameterStore.getTerritoryProjection(code) ?? selectedProjection)
      if (scale !== undefined && parameterRegistry.validate('scaleMultiplier', scale, family).ok) {
        parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)
      }
      if (translation && parameterRegistry.validate('translateOffset', translation, family).ok) {
        parameterStore.setTerritoryTranslation(code, 'x', translation[0])
        parameterStore.setTerritoryTranslation(code, 'y', translation[1])
      }
    }
  }

  function clearAllApplicationData(): void {
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

  async function selectViewMode(viewMode: ViewMode): Promise<void> {
    if (viewMode === viewStore.viewMode) {
      return
    }

    viewStore.viewMode = viewMode
    viewStore.clearViewPreset()

    parameterStore.clearGlobalParameters()
    presetDefaults.storeGlobalParameters(null)

    if (viewMode !== 'composite-custom') {
      presetDefaults.clearAll()
    }

    await viewStore.loadAvailableViewPresets()

    if (viewMode === 'composite-custom') {
      await initializeAtlas({ preserveViewMode: true })
    }
    else {
      await viewStore.autoLoadFirstPreset(`view mode changed to ${viewMode}`)
    }
  }

  async function selectAtlas(atlasId: AtlasId): Promise<void> {
    const previousAtlasId = atlasStore.selectedAtlasId
    if (atlasId === previousAtlasId) {
      return
    }

    atlasStore.selectedAtlasId = atlasId
    const result = await initializeAtlas({ preserveViewMode: true })

    if (result.ok) {
      debug('Atlas changed: %s -> %s', previousAtlasId, atlasId)
      return
    }

    debug('Atlas change failed: %O', result.error)

    atlasStore.selectedAtlasId = previousAtlasId
    uiStore.showErrorToast({ code: 'ATLAS_SWITCH_FAILED', atlasId, cause: result.error }, 5000)

    // The failed initialization cleared the data of the previous atlas
    const restored = await initializeAtlas({ preserveViewMode: true })
    if (!restored.ok) {
      debug('Atlas restore failed: %O', restored.error)
    }
  }

  return {
    startMapView,
    initializeAtlas,
    loadPreset,
    readConfigurationFile,
    importConfiguration,
    resetTransforms,
    resetTerritoryToDefaults,
    selectAtlas,
    selectViewMode,
  }
})
