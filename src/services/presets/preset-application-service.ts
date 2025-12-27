/**
 * Preset Application Service
 *
 * Centralizes all preset application logic in one place.
 * Handles the complexity of applying different preset types to stores.
 */

import type {
  CompositeCustomConfig,
  CompositeExistingViewConfig,
  Preset,
  SplitViewConfig,
  UnifiedViewConfig,
} from '@/core/presets'

import type { ProjectionId, TerritoryCode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { useAtlasStore } from '@/stores/atlas'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { logger } from '@/utils/logger'

const debug = logger.presets.manager

/**
 * Application result with success status and error messages
 */
export interface ApplicationResult {
  success: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Service for applying presets to application state
 */
export class PresetApplicationService {
  /**
   * Apply any preset type to stores
   * Routes to appropriate handler based on preset type
   */
  static applyPreset(preset: Preset): ApplicationResult {
    try {
      switch (preset.type) {
        case 'composite-custom':
          return this.applyCompositeCustom(preset.config as CompositeCustomConfig)
        case 'unified':
          return this.applyUnified(preset.config as UnifiedViewConfig)
        case 'split':
          return this.applySplit(preset.config as SplitViewConfig)
        case 'built-in-composite':
          return this.applyCompositeExisting(preset.config as CompositeExistingViewConfig)
        default:
          return {
            success: false,
            errors: [`Unknown preset type: ${(preset as any).type}`],
            warnings: [],
          }
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      }
    }
  }

  /**
   * Apply composite-custom preset
   *
   * Note: This handler is defensive code only. Composite-custom presets
   * are loaded through InitializationService during atlas initialization,
   * not through the view preset API. This method exists to complete the
   * strategy pattern and provide clear error messaging if misused.
   *
   * Correct loading path:
   * - InitializationService.initializeAtlas()
   * - -> PresetLoader.loadPreset()
   * - -> convertToDefaults() + extractTerritoryParameters()
   * - -> Apply to stores (parameterStore, projectionStore, viewStore)
   *
   * The view preset API (this service) is only for unified, split, and
   * built-in-composite presets which have simpler application requirements.
   * Composite-custom presets require full initialization sequence with
   * parameter extraction and service orchestration.
   */
  private static applyCompositeCustom(_config: CompositeCustomConfig): ApplicationResult {
    // This should never be called due to filtering in loadAvailableViewPresets()
    // but we provide a clear error message as defensive programming
    return {
      success: false,
      errors: ['Composite-custom presets should be loaded through atlas initialization, not view preset API'],
      warnings: [],
    }
  }

  /**
   * Apply unified view preset
   * Single projection for entire atlas
   */
  private static applyUnified(config: UnifiedViewConfig): ApplicationResult {
    const projectionStore = useProjectionStore()
    const parameterStore = useParameterStore()
    const presetDefaults = getSharedPresetDefaults()

    try {
      // Convert: config.projection.id from preset is string
      projectionStore.selectedProjection = config.projection.id as ProjectionId

      // Apply projection parameters as atlas defaults (not global overrides)
      // This ensures hasCustomParams returns false on initial load
      // Note: Legacy to canonical conversion is handled by parameterStore.setAtlasParameters
      if (config.projection.parameters) {
        const params = { ...config.projection.parameters } as ProjectionParameters
        parameterStore.setAtlasParameters(params)
        presetDefaults.storeGlobalParameters(params)
      }
      else {
        parameterStore.setAtlasParameters({})
        presetDefaults.storeGlobalParameters(null)
      }

      return {
        success: true,
        errors: [],
        warnings: [],
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Failed to apply unified preset: ${error}`],
        warnings: [],
      }
    }
  }

  /**
   * Apply split view preset
   * Individual projections per territory
   */
  private static applySplit(config: SplitViewConfig): ApplicationResult {
    const atlasStore = useAtlasStore()
    const parameterStore = useParameterStore()

    try {
      // Get mainland code from atlas
      const mainland = atlasStore.atlasService?.getMainland()
      const mainlandCode = mainland?.code

      // Apply mainland projection
      if (mainlandCode && config.mainland) {
        parameterStore.setTerritoryProjection(
          // Convert: Territory code from config
          mainlandCode as TerritoryCode,
          // Convert: Projection ID from config
          config.mainland.projection.id as ProjectionId,
        )
        if (config.mainland.projection.parameters) {
          parameterStore.setTerritoryParameters(
            // Convert: Territory code from config
            mainlandCode as TerritoryCode,
            config.mainland.projection.parameters,
          )
        }
      }

      // Apply territory projections
      if (config.territories) {
        for (const [code, territoryConfig] of Object.entries(config.territories)) {
          // Convert: Territory codes and projection IDs from config
          parameterStore.setTerritoryProjection(code as TerritoryCode, territoryConfig.projection.id as ProjectionId)
          if (territoryConfig.projection.parameters) {
            parameterStore.setTerritoryParameters(code as TerritoryCode, territoryConfig.projection.parameters)
          }
        }
      }

      return {
        success: true,
        errors: [],
        warnings: [],
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Failed to apply split preset: ${error}`],
        warnings: [],
      }
    }
  }

  /**
   * Apply built-in-composite preset
   * Uses d3-composite-projections library
   */
  private static applyCompositeExisting(config: CompositeExistingViewConfig): ApplicationResult {
    const projectionStore = useProjectionStore()

    try {
      // Convert: config.projectionId from preset is string
      projectionStore.compositeProjection = config.projectionId as ProjectionId

      // Note: Global scale for built-in-composite mode is not yet fully supported
      // d3-composite-projections doesn't expose a scale multiplier API
      if (config.globalScale !== undefined) {
        debug('Global scale from preset (not applied): %d', config.globalScale)
      }

      return {
        success: true,
        errors: [],
        warnings: config.globalScale !== undefined ? ['Global scale is not yet supported for built-in-composite mode'] : [],
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Failed to apply built-in-composite preset: ${error}`],
        warnings: [],
      }
    }
  }
}
