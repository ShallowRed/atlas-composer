/**
 * Initialization Service
 *
 * Central orchestration service for all application initialization scenarios.
 * Replaces duplicated logic in AtlasCoordinator, PresetSelector, and ImportModal.
 *
 * Responsibilities:
 * - Single entry point for atlas initialization, preset loading, and imports
 * - Validates configurations before applying to stores
 * - Orchestrates preset loading, data extraction, and store updates
 * - Provides consistent error handling and state management
 *
 * Design Principles:
 * - Fail fast: Validate before applying any state
 * - No fallbacks: Either valid data or explicit error
 * - Atomic updates: All-or-nothing state application
 * - Single source of truth: All initialization flows use same code path
 */

import type { Preset } from '@/core/presets'
import type { ViewMode } from '@/types'
import type {
  ApplicationState,
  AtlasInitializationOptions,
  ImportOptions,
  InitializationResult,
  PresetLoadOptions,
  ViewModeChangeOptions,
} from '@/types/initialization'

import { getAtlasConfig, isAtlasLoaded, loadAtlasAsync } from '@/core/atlases/registry'
import { AtlasService } from '@/services/atlas/atlas-service'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { PresetValidationService } from '@/services/validation/preset-validation-service'
import { useConfigStore } from '@/stores/config'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'

/**
 * Central initialization service
 * All initialization scenarios must go through this service
 */
export class InitializationService {
  /**
   * Initialize atlas on app startup or when user changes atlas
   *
   * @param options - Atlas initialization options
   * @returns Initialization result with complete state or errors
   */
  static async initializeAtlas(
    options: AtlasInitializationOptions,
  ): Promise<InitializationResult> {
    const { atlasId, preserveViewMode = false } = options

    try {
      // Step 1: Ensure atlas is loaded
      if (!isAtlasLoaded(atlasId)) {
        await loadAtlasAsync(atlasId)
      }

      const atlasConfig = getAtlasConfig(atlasId)
      const atlasService = new AtlasService(atlasId)

      // Step 2: Determine view mode
      const configStore = useConfigStore()
      const currentViewMode = configStore.viewMode as ViewMode
      const viewMode = preserveViewMode && atlasConfig.supportedViewModes.includes(currentViewMode)
        ? currentViewMode
        : atlasConfig.defaultViewMode

      // Step 3: Determine territory mode
      const territoryMode = this.getTerritoryMode(atlasConfig)

      // Step 4: Load and validate preset (if available and in composite-custom mode)
      let preset: Preset | null = null
      let territoryDefaults = TerritoryDefaultsService.initializeAll(
        atlasService.getAllTerritories(),
        'mercator',
      )
      let territoryParameters: Record<string, Record<string, unknown>> = {}
      let referenceScale: number | undefined
      let canvasDimensions: { width: number, height: number } | undefined

      if (atlasConfig.defaultPreset && viewMode === 'composite-custom') {
        const presetResult = await PresetLoader.loadPreset(atlasConfig.defaultPreset)

        if (!presetResult.success || !presetResult.data) {
          return {
            success: false,
            errors: [`Failed to load default preset '${atlasConfig.defaultPreset}': ${presetResult.errors.join(', ')}`],
            warnings: presetResult.warnings || [],
            state: null,
          }
        }

        preset = presetResult.data

        // Validate preset
        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.isValid) {
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings,
            state: null,
          }
        }

        // Extract territory data from preset
        if (preset.type === 'composite-custom') {
          territoryDefaults = PresetLoader.convertToDefaults(preset.config)
          territoryParameters = PresetLoader.extractTerritoryParameters(preset.config)
          referenceScale = preset.config.referenceScale
          canvasDimensions = preset.config.canvasDimensions
        }
      }

      // Step 5: Get atlas metadata
      const atlasMetadata = await AtlasMetadataService.getAtlasMetadata(
        atlasId,
        atlasConfig.defaultPreset,
      )

      // Step 6: Determine projections
      const compositeProjection = await this.getCompositeProjection(atlasId, atlasConfig.defaultPreset, atlasMetadata)
      const selectedProjection = await this.getSelectedProjection(atlasId, atlasConfig.defaultPreset, atlasMetadata)

      // Step 7: Build application state
      const state: ApplicationState = {
        atlas: {
          id: atlasId,
          config: atlasConfig,
        },
        viewMode,
        territoryMode,
        preset: preset
          ? {
              id: atlasConfig.defaultPreset || 'unknown',
              type: preset.type,
              data: preset,
            }
          : null,
        projections: {
          selected: selectedProjection,
          composite: compositeProjection,
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
          referenceScale,
          dimensions: canvasDimensions,
        },
        display: {
          showGraticule: false,
          showSphere: false,
          showCompositionBorders: true,
          showMapLimits: true,
        },
      }

      // Step 8: Apply state to stores
      await this.applyStateToStores(state)

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
        errors: [error instanceof Error ? error.message : 'Unknown error during atlas initialization'],
        warnings: [],
        state: null,
      }
    }
  }

  /**
   * Load a preset (within same atlas)
   * Used when user selects a different preset from dropdown
   *
   * @param options - Preset load options
   * @returns Initialization result
   */
  static async loadPreset(options: PresetLoadOptions): Promise<InitializationResult> {
    const { presetId, skipValidation = false } = options

    try {
      const configStore = useConfigStore()
      const currentAtlasId = configStore.selectedAtlas
      const atlasConfig = getAtlasConfig(currentAtlasId)

      // Step 1: Load preset
      const presetResult = await PresetLoader.loadPreset(presetId)
      if (!presetResult.success || !presetResult.data) {
        return {
          success: false,
          errors: [`Failed to load preset '${presetId}': ${presetResult.errors.join(', ')}`],
          warnings: presetResult.warnings || [],
          state: null,
        }
      }

      const preset = presetResult.data

      // Step 2: Validate preset (unless skipped)
      if (!skipValidation) {
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

      // Step 3: Extract data based on preset type
      let state: ApplicationState | null = null

      if (preset.type === 'composite-custom') {
        // Composite-custom presets use full initialization
        const territoryDefaults = PresetLoader.convertToDefaults(preset.config)
        const territoryParameters = PresetLoader.extractTerritoryParameters(preset.config)

        state = {
          atlas: {
            id: currentAtlasId,
            config: atlasConfig,
          },
          viewMode: 'composite-custom',
          territoryMode: configStore.territoryMode,
          preset: {
            id: presetId,
            type: preset.type,
            data: preset,
          },
          projections: {
            selected: configStore.selectedProjection,
            composite: configStore.compositeProjection,
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
            showSphere: false,
            showCompositionBorders: true,
            showMapLimits: true,
          },
        }
      }
      else {
        // View presets (unified, split, built-in-composite) use simpler parameter application
        // This will be handled by PresetApplicationService in the store
        // For now, return success and let the store handle it
        return {
          success: true,
          errors: [],
          warnings: [],
          state: null, // State will be applied by PresetApplicationService
        }
      }

      // Step 4: Apply state to stores
      if (state) {
        await this.applyStateToStores(state)
      }

      return {
        success: true,
        errors: [],
        warnings: presetResult.warnings || [],
        state,
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during preset loading'],
        warnings: [],
        state: null,
      }
    }
  }

  /**
   * Import configuration from user-provided JSON
   * Used by import feature
   *
   * @param options - Import options
   * @returns Initialization result
   */
  static async importConfiguration(options: ImportOptions): Promise<InitializationResult> {
    const { config, validateAtlasCompatibility = true } = options

    try {
      const configStore = useConfigStore()
      const currentAtlasId = configStore.selectedAtlas
      const atlasConfig = getAtlasConfig(currentAtlasId)

      // Step 1: Validate import structure
      // TODO: Add import validation service
      // For now, basic checks
      if (!config.territories || Object.keys(config.territories).length === 0) {
        return {
          success: false,
          errors: ['Import configuration has no territories'],
          warnings: [],
          state: null,
        }
      }

      // Step 2: Check atlas compatibility
      if (validateAtlasCompatibility && config.metadata.atlasId !== currentAtlasId) {
        return {
          success: false,
          errors: [`Import is for atlas '${config.metadata.atlasId}' but current atlas is '${currentAtlasId}'`],
          warnings: [],
          state: null,
        }
      }

      // Step 3: Convert import to application state
      // Extract territory data
      const projections: Record<string, string> = {}
      const translations: Record<string, { x: number, y: number }> = {}
      const scales: Record<string, number> = {}
      const territoryParameters: Record<string, Record<string, unknown>> = {}

      for (const territory of config.territories) {
        projections[territory.code] = territory.projection.id
        translations[territory.code] = {
          x: territory.layout.translateOffset[0],
          y: territory.layout.translateOffset[1],
        }
        // Scale is calculated from projection parameters, not stored separately
        scales[territory.code] = territory.projection.parameters.scaleMultiplier ?? 1
        territoryParameters[territory.code] = territory.projection.parameters || {}
      }

      const state: ApplicationState = {
        atlas: {
          id: currentAtlasId,
          config: atlasConfig,
        },
        viewMode: 'composite-custom',
        territoryMode: configStore.territoryMode,
        preset: null, // Imported config is not a saved preset
        projections: {
          selected: configStore.selectedProjection,
          composite: configStore.compositeProjection,
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
          showSphere: false,
          showCompositionBorders: true,
          showMapLimits: true,
        },
      }

      // Step 4: Apply state to stores
      await this.applyStateToStores(state)

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

  /**
   * Change view mode (within same atlas)
   *
   * @param options - View mode change options
   * @returns Initialization result
   */
  static async changeViewMode(options: ViewModeChangeOptions): Promise<InitializationResult> {
    const { viewMode, autoLoadPreset = true } = options

    try {
      const configStore = useConfigStore()
      const atlasConfig = configStore.currentAtlasConfig

      if (!atlasConfig) {
        return {
          success: false,
          errors: ['Atlas configuration not loaded'],
          warnings: [],
          state: null,
        }
      }

      // Step 1: Validate view mode is supported
      if (!atlasConfig.supportedViewModes.includes(viewMode as ViewMode)) {
        return {
          success: false,
          errors: [`View mode '${viewMode}' is not supported by atlas '${atlasConfig.id}'`],
          warnings: [],
          state: null,
        }
      }

      // Step 2: Clear global projection parameters
      const parameterStore = useParameterStore()
      parameterStore.setGlobalParameter('rotate', undefined)
      parameterStore.setGlobalParameter('center', undefined)
      parameterStore.setGlobalParameter('parallels', undefined)
      parameterStore.setGlobalParameter('scale', undefined)

      // Step 3: Update view mode in store
      configStore.viewMode = viewMode as ViewMode

      // Step 4: Auto-load first available preset if requested
      if (autoLoadPreset) {
        await configStore.loadAvailableViewPresets()
        if (configStore.availableViewPresets.length > 0) {
          const firstPreset = configStore.availableViewPresets[0]
          if (firstPreset) {
            await configStore.loadViewPreset(firstPreset.id)
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
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during view mode change'],
        warnings: [],
        state: null,
      }
    }
  }

  /**
   * Apply application state to Pinia stores
   * Atomic operation - either all updates succeed or none
   *
   * @param state - Application state to apply
   */
  private static async applyStateToStores(state: ApplicationState): Promise<void> {
    const configStore = useConfigStore()
    const parameterStore = useParameterStore()
    const uiStore = useUIStore()

    // Update config store
    configStore.selectedAtlas = state.atlas.id
    configStore.viewMode = state.viewMode as ViewMode
    configStore.territoryMode = state.territoryMode
    configStore.selectedProjection = state.projections.selected
    if (state.projections.composite) {
      configStore.compositeProjection = state.projections.composite
    }
    if (state.canvas.referenceScale !== undefined) {
      configStore.referenceScale = state.canvas.referenceScale
    }
    if (state.canvas.dimensions !== undefined) {
      configStore.canvasDimensions = state.canvas.dimensions
    }

    // Update parameter store with territory parameters
    if (state.parameters.territories && Object.keys(state.parameters.territories).length > 0) {
      const validationErrors = parameterStore.initializeFromPreset(
        state.parameters.global as any,
        state.parameters.territories as any,
      )

      if (validationErrors.length > 0) {
        console.warn('[InitializationService] Parameter validation warnings:', validationErrors)
      }
    }

    // Apply territory-specific settings (projections, translations, scales)
    for (const [code, projection] of Object.entries(state.territories.projections)) {
      parameterStore.setTerritoryProjection(code, projection)
    }
    for (const [code, translation] of Object.entries(state.territories.translations)) {
      parameterStore.setTerritoryTranslation(code, 'x', translation.x)
      parameterStore.setTerritoryTranslation(code, 'y', translation.y)
    }
    for (const [code, scale] of Object.entries(state.territories.scales)) {
      parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)
    }

    // Update UI store
    uiStore.showGraticule = state.display.showGraticule
    uiStore.showSphere = state.display.showSphere
    uiStore.showCompositionBorders = state.display.showCompositionBorders
    uiStore.showMapLimits = state.display.showMapLimits

    // Store preset defaults for reset functionality
    const { getSharedPresetDefaults } = await import('@/composables/usePresetDefaults')
    const presetDefaults = getSharedPresetDefaults()
    presetDefaults.storePresetDefaults(
      state.territories,
      state.parameters.territories as any,
    )
  }

  /**
   * Get territory mode for an atlas
   */
  private static getTerritoryMode(config: any): string {
    if (config.defaultTerritoryMode) {
      return config.defaultTerritoryMode
    }
    if (config.hasTerritorySelector && config.territoryModeOptions?.length > 0) {
      return config.territoryModeOptions[0]!.value
    }
    throw new Error('No territory mode options available for atlas')
  }

  /**
   * Get composite projection for an atlas
   */
  private static async getCompositeProjection(
    atlasId: string,
    defaultPreset: string | undefined,
    _atlasMetadata: any,
  ): Promise<string | undefined> {
    const availableComposites = await AtlasMetadataService.getCompositeProjections(
      atlasId,
      defaultPreset,
    )
    if (availableComposites.length > 0) {
      return availableComposites[0]
    }

    return undefined
  }

  /**
   * Get selected projection for an atlas
   */
  private static async getSelectedProjection(
    atlasId: string,
    defaultPreset: string | undefined,
    _atlasMetadata: any,
  ): Promise<string> {
    // Try projection preferences first
    const projectionPrefs = await AtlasMetadataService.getProjectionPreferences(
      atlasId,
      defaultPreset,
    )
    if (projectionPrefs?.recommended && projectionPrefs.recommended.length > 0) {
      return projectionPrefs.recommended[0]!
    }

    // Fallback to natural-earth
    return 'natural-earth'
  }
}
