import type { Preset, UnifiedViewConfig } from '@/core/presets'
import type { ViewMode } from '@/types'
import type { AtlasId, PresetId, ProjectionId, TerritoryCode } from '@/types/branded'
import type {
  ApplicationState,
  AtlasInitializationOptions,
  ImportOptions,
  InitializationResult,
  PresetLoadOptions,
  ViewModeChangeOptions,
} from '@/types/initialization'

import { nextTick } from 'vue'
import { getAtlasConfig, getAvailableViewModes, getDefaultPresetForViewMode, getDefaultViewMode, isAtlasLoaded, loadAtlasAsync } from '@/core/atlases/registry'
import { AtlasService } from '@/services/atlas/atlas-service'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
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

export class InitializationService {
  static async initializeAtlas(
    options: AtlasInitializationOptions,
  ): Promise<InitializationResult> {
    const { atlasId, preserveViewMode = false } = options

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

      const territoryMode = this.getTerritoryMode(atlasConfig)

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
          return {
            success: false,
            errors: [`No default preset defined for atlas '${atlasId}' in composite-custom mode`],
            warnings: [],
            state: null,
          }
        }

        const presetResult = await PresetLoader.loadPreset(defaultPresetId)

        if (!presetResult.success || !presetResult.data) {
          return {
            success: false,
            errors: [`Failed to load default preset '${defaultPresetId}': ${presetResult.errors.join(', ')}`],
            warnings: presetResult.warnings || [],
            state: null,
          }
        }

        preset = presetResult.data

        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.isValid) {
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings,
            state: null,
          }
        }

        if (preset.type === 'composite-custom') {
          territoryDefaults = PresetLoader.convertToDefaults(preset.config)
          territoryParameters = PresetLoader.extractTerritoryParameters(preset.config)
          referenceScale = preset.config.referenceScale
          canvasDimensions = preset.config.canvasDimensions
        }
      }
      else if (['unified', 'split', 'built-in-composite'].includes(viewMode)) {
        if (!defaultPresetId) {
          return {
            success: false,
            errors: [`No default preset defined for atlas '${atlasId}' in ${viewMode} mode`],
            warnings: [],
            state: null,
          }
        }

        const presetResult = await PresetLoader.loadPreset(defaultPresetId)

        if (!presetResult.success || !presetResult.data) {
          return {
            success: false,
            errors: [`Failed to load default preset '${defaultPresetId}': ${presetResult.errors.join(', ')}`],
            warnings: presetResult.warnings || [],
            state: null,
          }
        }

        preset = presetResult.data

        if (preset.type !== viewMode) {
          return {
            success: false,
            errors: [`Default preset '${defaultPresetId}' has type '${preset.type}' but expected '${viewMode}'`],
            warnings: [],
            state: null,
          }
        }

        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.isValid) {
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings,
            state: null,
          }
        }
      }

      let atlasParameters: Record<string, unknown> = {}
      if (viewMode === 'unified' && preset?.type === 'unified') {
        const unifiedConfig = preset.config as UnifiedViewConfig
        if (unifiedConfig.projection?.parameters) {
          atlasParameters = { ...unifiedConfig.projection.parameters }
        }
      }

      const atlasMetadata = await AtlasMetadataService.getAtlasMetadata(
        atlasId,
        defaultPresetId,
      )

      const compositeProjection = await this.getCompositeProjection(atlasId, defaultPresetId, atlasMetadata)
      const selectedProjection = await this.getSelectedProjection(atlasId, defaultPresetId, atlasMetadata)
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

      const filteredAtlasConfig = this.filterAtlasConfigByPreset(atlasConfig, state.parameters.territories)
      debug('Filtered atlas config for %s: %d preset territories', atlasId, Object.keys(state.parameters.territories).length)

      await this.applyStateToStores(state)

      await nextTick()

      const validationErrors = this.validateTerritoryParameters(
        filteredAtlasConfig,
        state.parameters.territories,
        state.viewMode,
      )
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors,
          warnings: [],
          state: null,
        }
      }

      const projectionValidationErrors = this.validateProjectionParameters(state.parameters.territories)
      if (projectionValidationErrors.length > 0) {
        return {
          success: false,
          errors: projectionValidationErrors,
          warnings: [],
          state: null,
        }
      }

      appStore.startLoadingGeoData()
      await geoDataStore.reinitialize(filteredAtlasConfig)

      await this.preloadAtlasData(territoryMode)
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
      const geoDataStore = useGeoDataStore()
      const appStore = useAppStore()
      geoDataStore.setReinitializing(false)
      appStore.setError(error instanceof Error ? error.message : 'Unknown error')

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during atlas initialization'],
        warnings: [],
        state: null,
      }
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
        await this.ensureAtlasDataLoaded(viewStore.territoryMode)
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
      const translations: Record<TerritoryCode, { x: number, y: number }> = {} as Record<TerritoryCode, { x: number, y: number }>
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
          ...(territory.projection.parameters || {}),
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

      await this.ensureAtlasDataLoaded(viewStore.territoryMode)

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

  static async changeViewMode(options: ViewModeChangeOptions): Promise<InitializationResult> {
    const { viewMode, autoLoadPreset = true } = options
    const appStore = useAppStore()

    try {
      appStore.startTransitioning()

      const atlasStore = useAtlasStore()
      const viewStore = useViewStore()
      const atlasConfig = atlasStore.currentAtlasConfig

      if (!atlasConfig) {
        return {
          success: false,
          errors: ['Atlas configuration not loaded'],
          warnings: [],
          state: null,
        }
      }

      const availableViewModes = getAvailableViewModes(atlasConfig.id as AtlasId)
      if (!availableViewModes.includes(viewMode as ViewMode)) {
        return {
          success: false,
          errors: [`View mode '${viewMode}' is not supported by atlas '${atlasConfig.id}'`],
          warnings: [],
          state: null,
        }
      }

      const parameterStore = useParameterStore()
      parameterStore.setGlobalParameter('rotate', undefined)
      parameterStore.setGlobalParameter('center', undefined)
      parameterStore.setGlobalParameter('parallels', undefined)
      parameterStore.setGlobalParameter('scale', undefined)

      if (viewMode !== 'composite-custom' && viewMode !== 'split') {
        const { getSharedPresetDefaults } = await import('@/composables/usePresetDefaults')
        const presetDefaults = getSharedPresetDefaults()
        presetDefaults.clearAll()
      }

      viewStore.viewMode = viewMode as ViewMode

      if (autoLoadPreset) {
        await viewStore.loadAvailableViewPresets()
        if (viewStore.availableViewPresets.length > 0) {
          const firstPreset = viewStore.availableViewPresets[0]
          if (firstPreset) {
            await viewStore.loadViewPreset(firstPreset.id as PresetId)
          }
        }
      }

      return {
        success: true,
        errors: [],
        warnings: [],
        state: null, // State managed by store for view mode changes
      }
    }
    catch (error) {
      const appStore = useAppStore()
      appStore.setError(error instanceof Error ? error.message : 'Unknown error')
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during view mode change'],
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

  private static getTerritoryMode(config: any): string {
    if (config.hasTerritorySelector && config.territoryModeOptions?.length > 0) {
      return config.territoryModeOptions[0]!.value
    }

    if (!config.hasTerritorySelector || config.isWildcard) {
      return 'all-territories'
    }

    throw new Error('No territory mode options available for atlas')
  }

  private static async getCompositeProjection(
    atlasId: AtlasId,
    defaultPreset: PresetId | undefined,
    _atlasMetadata: any,
  ): Promise<ProjectionId | undefined> {
    const availableComposites = await AtlasMetadataService.getCompositeProjections(
      atlasId,
      defaultPreset,
    )
    if (availableComposites.length > 0) {
      return availableComposites[0]
    }

    return undefined
  }

  private static async getSelectedProjection(
    atlasId: AtlasId,
    defaultPreset: PresetId | undefined,
    _atlasMetadata: any,
  ): Promise<ProjectionId> {
    const projectionPrefs = await AtlasMetadataService.getProjectionPreferences(
      atlasId,
      defaultPreset,
    )
    if (projectionPrefs?.recommended && projectionPrefs.recommended.length > 0) {
      return projectionPrefs.recommended[0] as ProjectionId
    }

    return 'natural-earth' as ProjectionId
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

  private static async preloadAtlasData(territoryMode: string): Promise<void> {
    const geoDataStore = useGeoDataStore()

    debug('Preloading all atlas data types')

    try {
      await geoDataStore.loadAllAtlasData(territoryMode)
    }
    catch (error) {
      debug('Failed to preload atlas data: %o', error)
      throw error
    }
  }

  private static async ensureAtlasDataLoaded(territoryMode: string): Promise<void> {
    const geoDataStore = useGeoDataStore()

    const hasTerritoryData = geoDataStore.territoriesData.length > 0
    const hasUnifiedData = geoDataStore.rawUnifiedData !== null

    if (hasTerritoryData && hasUnifiedData) {
      debug('Atlas data already loaded, skipping preload')
      return
    }

    debug('Atlas data not fully loaded, preloading...')
    await this.preloadAtlasData(territoryMode)
  }

  private static filterAtlasConfigByPreset(
    atlasConfig: any,
    territoryParameters: Record<string, Record<string, unknown>>,
  ): any {
    const compositeConfig = atlasConfig.compositeProjectionConfig

    if (!compositeConfig) {
      return atlasConfig
    }

    const territoriesInPreset = new Set(Object.keys(territoryParameters))

    const filteredTerritories = compositeConfig.territories.filter((t: any) =>
      territoriesInPreset.has(t.code),
    )

    debug('Filtered territories: %d in preset, %d filtered', territoriesInPreset.size, filteredTerritories.length)

    return {
      ...atlasConfig,
      compositeProjectionConfig: {
        territories: filteredTerritories,
      },
    }
  }

  private static validateTerritoryParameters(
    atlasConfig: any,
    territoryParameters: Record<string, Record<string, unknown>>,
    viewMode: string,
  ): string[] {
    const errors: string[] = []

    if (viewMode === 'unified' || viewMode === 'split' || viewMode === 'built-in-composite') {
      return errors
    }

    const compositeConfig = atlasConfig.compositeProjectionConfig

    if (!compositeConfig) {
      return errors
    }

    const territoriesToValidate: string[] = compositeConfig.territories?.map((t: any) => t.code) ?? []

    for (const territoryCode of territoriesToValidate) {
      const params = territoryParameters[territoryCode]
      if (!params || !params.projectionId) {
        errors.push(`Territory '${territoryCode}' missing required parameter 'projectionId'`)
      }
    }

    if (errors.length > 0) {
      debug('Territory parameter validation failed: %O', errors)
    }

    return errors
  }

  private static validateProjectionParameters(
    territoryParameters: Record<string, Record<string, unknown>>,
  ): string[] {
    const errors: string[] = []

    for (const [territoryCode, params] of Object.entries(territoryParameters)) {
      const projectionFamily = params.projectionFamily as string | undefined

      if (!projectionFamily) {
        continue
      }

      if (projectionFamily === 'CONIC') {
        if (params.center !== undefined) {
          errors.push(
            `Territory '${territoryCode}' uses CONIC projection but has 'center' parameter. `
            + `CONIC projections should use 'rotate' instead. `
            + `Expected: rotate: [lon, -lat, 0], got center: ${JSON.stringify(params.center)}`,
          )
        }
        if (!params.rotate) {
          errors.push(
            `Territory '${territoryCode}' uses CONIC projection but missing 'rotate' parameter. `
            + `CONIC projections require 'rotate': [longitude, -latitude, 0]`,
          )
        }
        if (!params.parallels || (Array.isArray(params.parallels) && params.parallels.every((p: any) => p === 0))) {
          errors.push(
            `Territory '${territoryCode}' uses CONIC projection but has invalid 'parallels' parameter. `
            + `Expected non-zero parallels like [37, 42], got: ${JSON.stringify(params.parallels)}`,
          )
        }
      }

      if (projectionFamily === 'CYLINDRICAL' || projectionFamily === 'AZIMUTHAL') {
        if (!params.center) {
          errors.push(
            `Territory '${territoryCode}' uses ${projectionFamily} projection but missing 'center' parameter. `
            + `${projectionFamily} projections require 'center': [longitude, latitude]`,
          )
        }
      }
    }

    if (errors.length > 0) {
      debug('Projection parameter validation failed: %O', errors)
    }

    return errors
  }
}
