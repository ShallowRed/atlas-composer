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

import { nextTick } from 'vue'
import { getAtlasConfig, getAvailableViewModes, getDefaultPresetForViewMode, getDefaultViewMode, isAtlasLoaded, loadAtlasAsync } from '@/core/atlases/registry'
import { AtlasService } from '@/services/atlas/atlas-service'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { PresetValidationService } from '@/services/validation/preset-validation-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'
import { logger } from '@/utils/logger'

const debug = logger.atlas.service

/**
 * Central initialization service
 * All initialization scenarios must go through this service
 */
export class InitializationService {
  /**
   * Initialize atlas on app startup or when user changes atlas
   *
   * Phase 4 Reset Strategy - ON ATLAS CHANGE:
   * - Clear ALL parameter store data (global + all territories)
   * - Clear ALL preset defaults
   * - Clear ALL geo data
   * - Reload everything from new atlas preset
   *
   * @param options - Atlas initialization options
   * @returns Initialization result with complete state or errors
   */
  static async initializeAtlas(
    options: AtlasInitializationOptions,
  ): Promise<InitializationResult> {
    const { atlasId, preserveViewMode = false } = options

    try {
      // Step 1: Ensure atlas is loaded (BEFORE clearing data)
      if (!isAtlasLoaded(atlasId)) {
        await loadAtlasAsync(atlasId)
      }

      const atlasConfig = getAtlasConfig(atlasId)
      const atlasService = new AtlasService(atlasId)

      // Step 2: Validate configuration (BEFORE clearing data)
      // Determine view mode
      const configStore = useConfigStore()
      const currentViewMode = configStore.viewMode as ViewMode
      const availableViewModes = getAvailableViewModes(atlasId)
      const viewMode = preserveViewMode && availableViewModes.includes(currentViewMode)
        ? currentViewMode
        : getDefaultViewMode(atlasId)

      // Determine territory mode (validate it exists BEFORE clearing data)
      const territoryMode = this.getTerritoryMode(atlasConfig)

      // Step 3: Clear all existing data (AFTER validation succeeds)
      // Only clear data once we know the atlas can be loaded successfully
      const geoDataStore = useGeoDataStore()
      geoDataStore.setReinitializing(true)
      await this.clearAllApplicationData()

      // Step 4: Load and validate preset (if available and in composite-custom mode)
      let preset: Preset | null = null
      let territoryDefaults = TerritoryDefaultsService.initializeAll(
        atlasService.getAllTerritories(),
        'mercator',
      )
      let territoryParameters: Record<string, Record<string, unknown>> = {}
      let referenceScale: number | undefined
      let canvasDimensions: { width: number, height: number } | undefined

      // Get default preset for the current view mode from registry
      const defaultPresetDef = getDefaultPresetForViewMode(atlasId, viewMode)
      const defaultPresetId = defaultPresetDef?.id

      // For composite-custom mode, preset is REQUIRED
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
      // For unified/split/built-in-composite modes, preset is also REQUIRED
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

        // Validate preset type matches view mode
        if (preset.type !== viewMode) {
          return {
            success: false,
            errors: [`Default preset '${defaultPresetId}' has type '${preset.type}' but expected '${viewMode}'`],
            warnings: [],
            state: null,
          }
        }

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
      }

      // Step 5: Get atlas metadata
      const atlasMetadata = await AtlasMetadataService.getAtlasMetadata(
        atlasId,
        defaultPresetId,
      )

      // Step 6: Determine projections
      const compositeProjection = await this.getCompositeProjection(atlasId, defaultPresetId, atlasMetadata)
      const selectedProjection = await this.getSelectedProjection(atlasId, defaultPresetId, atlasMetadata)

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
              id: defaultPresetId || 'unknown',
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
          showCompositionBorders: true,
          showMapLimits: true,
        },
      }

      // Step 8: Filter atlas compositeConfig to only include territories defined in preset
      // Preset is the source of truth for which territories to render
      const filteredAtlasConfig = this.filterAtlasConfigByPreset(atlasConfig, state.parameters.territories)
      debug('Filtered atlas config for %s: %d preset territories', atlasId, Object.keys(state.parameters.territories).length)

      // Step 8a: Apply state to stores
      await this.applyStateToStores(state)

      // Step 8b: Ensure Vue reactivity has settled
      // Guarantees parameter store updates are committed before geoDataStore reads them
      await nextTick()

      // Step 8c: Validate that all territories in filtered config have parameters
      // Only validate for composite modes (not unified/split which use global projection)
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

      // Step 8d: Validate projection parameters are correct for projection family
      const projectionValidationErrors = this.validateProjectionParameters(state.parameters.territories)
      if (projectionValidationErrors.length > 0) {
        return {
          success: false,
          errors: projectionValidationErrors,
          warnings: [],
          state: null,
        }
      }

      // Step 9: Reinitialize geoDataStore with filtered atlas config
      await geoDataStore.reinitialize(filteredAtlasConfig)

      // Step 10: Preload all data types for the atlas
      await this.preloadAtlasData(territoryMode)

      // Step 11: Clear reinitializing flag and trigger render
      geoDataStore.setReinitializing(false)
      geoDataStore.triggerRender()

      return {
        success: true,
        errors: [],
        warnings: [],
        state,
      }
    }
    catch (error) {
      // Clear reinitializing flag on error too
      const geoDataStore = useGeoDataStore()
      geoDataStore.setReinitializing(false)

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
   * Phase 4 Reset Strategy - ON PRESET SWITCH (same atlas, same view mode):
   * - Clear ALL parameters
   * - Apply new preset parameters
   * - Keep geo data loaded (unchanged)
   * - Update preset defaults for reset functionality
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

        // Step 5: Preload all data types (keep existing data loaded)
        // Only reload if data is not already present
        await this.ensureAtlasDataLoaded(configStore.territoryMode)
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

        // Combine projection parameters with layout parameters
        const params: Record<string, unknown> = {
          // Start with all projection parameters
          ...(territory.projection.parameters || {}),
          // Add layout parameters
          translateOffset: territory.layout.translateOffset,
        }

        // Add pixelClipExtent if defined (stored in layout section)
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
          showCompositionBorders: true,
          showMapLimits: true,
        },
      }

      // Step 4: Apply state to stores
      await this.applyStateToStores(state)

      // Step 5: Ensure all data types are loaded
      await this.ensureAtlasDataLoaded(configStore.territoryMode)

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
   * Phase 4 Reset Strategy - ON VIEW MODE CHANGE (same atlas):
   * - Keep territory data loaded (already preloaded)
   * - Keep unified data loaded (already preloaded)
   * - Clear ONLY global projection parameters
   * - Load view mode preset if available
   * - Preserve territory-specific edits in composite-custom mode
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
      const availableViewModes = getAvailableViewModes(atlasConfig.id)
      if (!availableViewModes.includes(viewMode as ViewMode)) {
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

    // Initialize active territory codes for custom composite mode
    const territoryCodes = Object.keys(state.parameters.territories)
    configStore.setActiveTerritories(territoryCodes)

    // Update parameter store with territory parameters
    if (state.parameters.territories && Object.keys(state.parameters.territories).length > 0) {
      const validationErrors = parameterStore.initializeFromPreset(
        state.parameters.global as any,
        state.parameters.territories as any,
      )

      if (validationErrors.length > 0) {
        debug('Parameter validation warnings: %O', validationErrors)
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
    uiStore.showCompositionBorders = state.display.showCompositionBorders
    uiStore.showMapLimits = state.display.showMapLimits

    // Store preset defaults for reset functionality
    // IMPORTANT: Only store for composite-custom mode
    // Built-in-composite, unified, and split modes should not use territory defaults from presets
    // as they manage their own positioning/parameters
    if (state.viewMode === 'composite-custom') {
      const { getSharedPresetDefaults } = await import('@/composables/usePresetDefaults')
      const presetDefaults = getSharedPresetDefaults()
      presetDefaults.storePresetDefaults(
        state.territories,
        state.parameters.territories as any,
      )
    }
  }

  /**
   * Get territory mode for an atlas
   */
  private static getTerritoryMode(config: any): string {
    if (config.hasTerritorySelector && config.territoryModeOptions?.length > 0) {
      return config.territoryModeOptions[0]!.value
    }

    // For atlases without territory selector (e.g., wildcard atlases like world)
    // Return a default mode identifier
    if (!config.hasTerritorySelector || config.isWildcard) {
      return 'all-territories'
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

  /**
   * Clear all application data
   * Phase 4: Clear reset strategy
   * Called on atlas change to ensure no contamination between atlases
   */
  private static async clearAllApplicationData(): Promise<void> {
    debug('Clearing all application data')

    const parameterStore = useParameterStore()
    const geoDataStore = useGeoDataStore()

    // Clear all parameters (global + territories)
    parameterStore.clearAll()

    // Clear all geodata
    geoDataStore.clearAllData()

    // Clear preset defaults
    const { getSharedPresetDefaults } = await import('@/composables/usePresetDefaults')
    const presetDefaults = getSharedPresetDefaults()
    presetDefaults.clearAll()

    debug('All application data cleared')
  }

  /**
   * Preload all data types for the current atlas
   * Phase 4: Preload strategy - loads territory + unified data upfront
   * Makes view mode switching synchronous (no async delays)
   *
   * @param territoryMode - Territory mode to use for unified data loading
   */
  private static async preloadAtlasData(territoryMode: string): Promise<void> {
    const geoDataStore = useGeoDataStore()

    debug('Preloading all atlas data types')

    try {
      // Use geoDataStore's preload method that loads territory + unified data in parallel
      await geoDataStore.loadAllAtlasData(territoryMode)
    }
    catch (error) {
      debug('Failed to preload atlas data: %o', error)
      throw error
    }
  }

  /**
   * Ensure atlas data is loaded (only loads if not already present)
   * Used by preset loading and imports to avoid reloading data unnecessarily
   *
   * @param territoryMode - Territory mode for unified data
   */
  private static async ensureAtlasDataLoaded(territoryMode: string): Promise<void> {
    const geoDataStore = useGeoDataStore()

    // Check if data is already loaded
    const hasTerritoryData = geoDataStore.overseasTerritoriesData.length > 0
    const hasUnifiedData = geoDataStore.rawUnifiedData !== null

    if (hasTerritoryData && hasUnifiedData) {
      debug('Atlas data already loaded, skipping preload')
      return
    }

    debug('Atlas data not fully loaded, preloading...')
    await this.preloadAtlasData(territoryMode)
  }

  /**
   * Filter atlas config to only include territories defined in preset
   * Preset is the source of truth for which territories should be rendered
   *
   * @param atlasConfig - Original atlas configuration
   * @param territoryParameters - Territory parameters from preset
   * @returns Filtered atlas configuration
   */
  private static filterAtlasConfigByPreset(
    atlasConfig: any,
    territoryParameters: Record<string, Record<string, unknown>>,
  ): any {
    const compositeConfig = atlasConfig.compositeProjectionConfig

    if (!compositeConfig) {
      // No composite config, return as-is
      return atlasConfig
    }

    const territoriesInPreset = new Set(Object.keys(territoryParameters))

    if (compositeConfig.type === 'single-focus') {
      // Filter overseas territories to only those in preset
      const filteredOverseas = compositeConfig.overseasTerritories.filter((t: any) =>
        territoriesInPreset.has(t.code),
      )

      debug('Filtered single-focus: %d territories in preset, %d overseas', territoriesInPreset.size, filteredOverseas.length)

      return {
        ...atlasConfig,
        compositeProjectionConfig: {
          ...compositeConfig,
          overseasTerritories: filteredOverseas,
        },
      }
    }
    else if (compositeConfig.type === 'equal-members') {
      // Filter mainlands and overseas territories
      const filteredMainlands = compositeConfig.mainlands.filter((t: any) =>
        territoriesInPreset.has(t.code),
      )
      const filteredOverseas = compositeConfig.overseasTerritories.filter((t: any) =>
        territoriesInPreset.has(t.code),
      )

      debug('Filtered equal-members: %d territories in preset (%d mainlands, %d overseas)', territoriesInPreset.size, filteredMainlands.length, filteredOverseas.length)

      return {
        ...atlasConfig,
        compositeProjectionConfig: {
          ...compositeConfig,
          mainlands: filteredMainlands,
          overseasTerritories: filteredOverseas,
        },
      }
    }

    return atlasConfig
  }

  /**
   * Validate that all territories in composite config have required parameters
   * Fail fast approach: Returns errors if validation fails
   *
   * @param atlasConfig - Atlas configuration
   * @param territoryParameters - Territory parameters from preset
   * @param viewMode - Current view mode
   * @returns Array of validation errors (empty if valid)
   */
  private static validateTerritoryParameters(
    atlasConfig: any,
    territoryParameters: Record<string, Record<string, unknown>>,
    viewMode: string,
  ): string[] {
    const errors: string[] = []

    // Skip validation for unified/split/built-in-composite modes - they use global projection, not per-territory
    if (viewMode === 'unified' || viewMode === 'split' || viewMode === 'built-in-composite') {
      return errors
    }

    const compositeConfig = atlasConfig.compositeProjectionConfig

    if (!compositeConfig) {
      // No composite config, no validation needed
      return errors
    }

    // Get all territory codes that should be rendered
    const territoriesToValidate: string[] = []

    if (compositeConfig.type === 'single-focus') {
      territoriesToValidate.push(compositeConfig.mainland.code)
      territoriesToValidate.push(...compositeConfig.overseasTerritories.map((t: any) => t.code))
    }
    else if (compositeConfig.type === 'equal-members') {
      territoriesToValidate.push(...compositeConfig.mainlands.map((t: any) => t.code))
      territoriesToValidate.push(...compositeConfig.overseasTerritories.map((t: any) => t.code))
    }

    // Validate each territory has projectionId (only for composite modes)
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

  /**
   * Validate projection parameters match projection family requirements
   * Catches common mistakes like using 'center' with CONIC projections
   *
   * @param territoryParameters - Territory parameters from preset
   * @returns Array of validation errors (empty if valid)
   */
  private static validateProjectionParameters(
    territoryParameters: Record<string, Record<string, unknown>>,
  ): string[] {
    const errors: string[] = []

    for (const [territoryCode, params] of Object.entries(territoryParameters)) {
      const projectionFamily = params.projectionFamily as string | undefined

      if (!projectionFamily) {
        continue // Skip if no family defined
      }

      // Validate CONIC projections don't use 'center' parameter
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

      // Validate CYLINDRICAL/AZIMUTHAL projections use 'center' not 'rotate'
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
