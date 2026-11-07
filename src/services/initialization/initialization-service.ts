import type { Preset, UnifiedViewConfig } from '@/core/presets'
import type { GeoDataError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { Translation, ViewMode } from '@/types'
import type { PresetId, ProjectionId, TerritoryCode } from '@/types/branded'
import type {
  ApplicationState,
  AtlasInitializationOptions,
  ImportOptions,
  InitializationResult,
  PresetLoadOptions,
} from '@/types/initialization'

import { nextTick } from 'vue'
import { getAtlasConfig, getAvailableViewModes, getDefaultPresetForViewMode, getDefaultViewMode, isAtlasLoaded, loadAtlasAsync } from '@/core/atlases/registry'
import { filterAtlasConfigByPreset, getInitialTerritoryMode } from '@/core/atlases/utils'
import { findPositioningErrors, findTerritoriesWithoutProjection } from '@/core/presets/validator'
import { TerritoryDefaultsService } from '@/core/territories/territory-defaults-service'
import { ok } from '@/core/types/result'
import { AtlasService } from '@/services/atlas/atlas-service'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { PresetValidationService } from '@/services/validation/preset-validation-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.atlas.service

function geoDataFailure(error: GeoDataError): string {
  return `Failed to load geographic data: ${error.code}`
}

export class InitializationService {
  static async initializeAtlas(
    options: AtlasInitializationOptions,
  ): Promise<InitializationResult> {
    const { atlasId, preserveViewMode = false } = options

    // Every failure resets the loading state and records the error
    const fail = (errors: string[], warnings: string[] = []): InitializationResult => {
      useGeoDataStore().setReinitializing(false)
      useAppStore().setError(errors.join(', '))
      return { success: false, errors, warnings, state: null }
    }

    try {
      if (!isAtlasLoaded(atlasId)) {
        await loadAtlasAsync(atlasId)
      }

      const atlasConfig = getAtlasConfig(atlasId)
      const atlasService = new AtlasService(atlasId)

      const viewStore = useViewStore()
      const currentViewMode = viewStore.viewMode as ViewMode
      const availableViewModes = getAvailableViewModes(atlasId)
      const viewMode = preserveViewMode && availableViewModes.includes(currentViewMode)
        ? currentViewMode
        : getDefaultViewMode(atlasId)

      const territoryMode = getInitialTerritoryMode(atlasConfig)

      const geoDataStore = useGeoDataStore()
      const appStore = useAppStore()
      appStore.startLoadingAtlas()
      geoDataStore.setReinitializing(true)
      await this.clearAllApplicationData()

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

        if (!presetResult.success || !presetResult.data) {
          return fail([`Failed to load default preset '${defaultPresetId}': ${presetResult.errors.join(', ')}`], presetResult.warnings || [])
        }

        preset = presetResult.data

        if (preset.type === 'composite-custom') {
          territoryDefaults = PresetLoader.convertToDefaults(preset.config)
          territoryParameters = PresetLoader.extractTerritoryParameters(preset.config)
          referenceScale = preset.config.referenceScale
          canvasDimensions = preset.config.canvasDimensions
        }
      }
      else if (['unified', 'split', 'built-in-composite'].includes(viewMode)) {
        if (!defaultPresetId) {
          return fail([`No default preset defined for atlas '${atlasId}' in ${viewMode} mode`])
        }

        const presetResult = await PresetLoader.loadPreset(defaultPresetId)

        if (!presetResult.success || !presetResult.data) {
          return fail([`Failed to load default preset '${defaultPresetId}': ${presetResult.errors.join(', ')}`], presetResult.warnings || [])
        }

        preset = presetResult.data

        if (preset.type !== viewMode) {
          return fail([`Default preset '${defaultPresetId}' has type '${preset.type}' but expected '${viewMode}'`])
        }

        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.isValid) {
          return fail(validation.errors, validation.warnings)
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

      await this.applyStateToStores(state)

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

      const preloadResult = await this.preloadAtlasData(territoryMode)
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
        state,
      }
    }
    catch (error) {
      return fail([error instanceof Error ? error.message : 'Unknown error during atlas initialization'])
    }
  }

  static async loadPreset(options: PresetLoadOptions): Promise<InitializationResult> {
    const { presetId, skipValidation = false } = options
    const appStore = useAppStore()

    try {
      appStore.startLoadingPreset()

      const atlasStore = useAtlasStore()
      const projectionStore = useProjectionStore()
      const viewStore = useViewStore()
      const currentAtlasId = atlasStore.selectedAtlasId
      const atlasConfig = getAtlasConfig(currentAtlasId)
      const presetResult = await PresetLoader.loadPreset(presetId)
      if (!presetResult.success || !presetResult.data) {
        appStore.setReady()
        return {
          success: false,
          errors: [`Failed to load preset '${presetId}': ${presetResult.errors.join(', ')}`],
          warnings: presetResult.warnings || [],
          state: null,
        }
      }

      const preset = presetResult.data

      if (!skipValidation) {
        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.isValid) {
          appStore.setReady()
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings,
            state: null,
          }
        }
      }

      let state: ApplicationState | null = null

      if (preset.type === 'composite-custom') {
        const territoryDefaults = PresetLoader.convertToDefaults(preset.config)
        const territoryParameters = PresetLoader.extractTerritoryParameters(preset.config)

        state = {
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
      }
      else {
        appStore.setReady()
        return {
          success: true,
          errors: [],
          warnings: [],
          state: null, // State will be applied by PresetApplicationService
        }
      }

      if (state) {
        await this.applyStateToStores(state)
        const geoDataResult = await this.ensureAtlasDataLoaded(viewStore.territoryMode)
        if (!geoDataResult.ok) {
          const message = geoDataFailure(geoDataResult.error)
          appStore.setError(message)
          return {
            success: false,
            errors: [message],
            warnings: [],
            state: null,
          }
        }
      }
      appStore.setReady()

      return {
        success: true,
        errors: [],
        warnings: presetResult.warnings || [],
        state,
      }
    }
    catch (error) {
      const appStore = useAppStore()
      appStore.setError(error instanceof Error ? error.message : 'Unknown error')
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during preset loading'],
        warnings: [],
        state: null,
      }
    }
  }

  static async importConfiguration(options: ImportOptions): Promise<InitializationResult> {
    const { config, validateAtlasCompatibility = true } = options

    try {
      const atlasStore = useAtlasStore()
      const projectionStore = useProjectionStore()
      const viewStore = useViewStore()
      const currentAtlasId = atlasStore.selectedAtlasId
      const atlasConfig = getAtlasConfig(currentAtlasId)

      if (!config.territories || Object.keys(config.territories).length === 0) {
        return {
          success: false,
          errors: ['Import configuration has no territories'],
          warnings: [],
          state: null,
        }
      }

      if (validateAtlasCompatibility && config.metadata.atlasId !== currentAtlasId) {
        return {
          success: false,
          errors: [`Import is for atlas '${config.metadata.atlasId}' but current atlas is '${currentAtlasId}'`],
          warnings: [],
          state: null,
        }
      }

      const projections: Record<TerritoryCode, ProjectionId> = {} as Record<TerritoryCode, ProjectionId>
      const translations: Record<TerritoryCode, Translation> = {} as Record<TerritoryCode, Translation>
      const scales: Record<TerritoryCode, number> = {} as Record<TerritoryCode, number>
      const territoryParameters: Record<string, Record<string, unknown>> = {}

      for (const territory of config.territories) {
        const code = territory.code as TerritoryCode
        projections[code] = territory.projection.id as ProjectionId
        translations[code] = {
          x: territory.layout.translateOffset[0],
          y: territory.layout.translateOffset[1],
        }
        scales[code] = territory.projection.parameters.scaleMultiplier ?? 1

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
        territories: {
          projections,
          translations,
          scales,
        },
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

      await this.applyStateToStores(state)

      const geoDataResult = await this.ensureAtlasDataLoaded(viewStore.territoryMode)
      if (!geoDataResult.ok) {
        return {
          success: false,
          errors: [geoDataFailure(geoDataResult.error)],
          warnings: [],
          state: null,
        }
      }

      return {
        success: true,
        errors: [],
        warnings: [],
        state,
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during import'],
        warnings: [],
        state: null,
      }
    }
  }

  private static async applyStateToStores(state: ApplicationState): Promise<void> {
    const atlasStore = useAtlasStore()
    const projectionStore = useProjectionStore()
    const viewStore = useViewStore()
    const parameterStore = useParameterStore()
    const uiStore = useUIStore()

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

      const { getSharedPresetDefaults } = await import('@/composables/usePresetDefaults')
      const presetDefaults = getSharedPresetDefaults()
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
      const { getSharedPresetDefaults } = await import('@/composables/usePresetDefaults')
      const presetDefaults = getSharedPresetDefaults()
      presetDefaults.storePresetDefaults(
        state.territories,
        state.parameters.territories as any,
      )
    }
  }

  private static async clearAllApplicationData(): Promise<void> {
    debug('Clearing all application data')

    const parameterStore = useParameterStore()
    const geoDataStore = useGeoDataStore()

    parameterStore.clearAll()

    geoDataStore.clearAllData()

    const { getSharedPresetDefaults } = await import('@/composables/usePresetDefaults')
    const presetDefaults = getSharedPresetDefaults()
    presetDefaults.clearAll()

    debug('All application data cleared')
  }

  private static async preloadAtlasData(territoryMode: string): Promise<Result<void, GeoDataError>> {
    debug('Preloading all atlas data types')
    return useGeoDataStore().loadAllAtlasData(territoryMode)
  }

  private static async ensureAtlasDataLoaded(territoryMode: string): Promise<Result<void, GeoDataError>> {
    const geoDataStore = useGeoDataStore()

    const hasTerritoryData = geoDataStore.territoriesData.length > 0
    const hasUnifiedData = geoDataStore.rawUnifiedData !== null

    if (hasTerritoryData && hasUnifiedData) {
      debug('Atlas data already loaded, skipping preload')
      return ok(undefined)
    }

    debug('Atlas data not fully loaded, preloading...')
    return this.preloadAtlasData(territoryMode)
  }
}
