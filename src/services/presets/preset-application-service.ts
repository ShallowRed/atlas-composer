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
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { useConfigStore } from '@/stores/config'
import { useParameterStore } from '@/stores/parameters'

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
   * Full custom composite projection with per-territory configuration
   *
   * Note: For now, delegates to config store which has complex logic for this.
   * TODO: Extract full logic here in future refactoring.
   */
  private static applyCompositeCustom(_config: CompositeCustomConfig): ApplicationResult {
    // Composite-custom presets are handled through a different path
    // They're loaded on atlas initialization, not through view preset system
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
    const configStore = useConfigStore()
    const parameterStore = useParameterStore()
    const presetDefaults = getSharedPresetDefaults()

    try {
      // Set projection
      configStore.selectedProjection = config.projection.id

      // Apply projection parameters
      if (config.projection.parameters) {
        parameterStore.setGlobalParameters(config.projection.parameters)
        presetDefaults.storeGlobalParameters(config.projection.parameters)
      }
      else {
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
    const configStore = useConfigStore()
    const parameterStore = useParameterStore()

    try {
      // Get mainland code from atlas
      const mainland = configStore.atlasService?.getMainland()
      const mainlandCode = mainland?.code

      // Apply mainland projection
      if (mainlandCode && config.mainland) {
        parameterStore.setTerritoryProjection(
          mainlandCode,
          config.mainland.projection.id,
        )
        if (config.mainland.projection.parameters) {
          parameterStore.setTerritoryParameters(
            mainlandCode,
            config.mainland.projection.parameters,
          )
        }
      }

      // Apply territory projections
      if (config.territories) {
        for (const [code, territoryConfig] of Object.entries(config.territories)) {
          parameterStore.setTerritoryProjection(code, territoryConfig.projection.id)
          if (territoryConfig.projection.parameters) {
            parameterStore.setTerritoryParameters(code, territoryConfig.projection.parameters)
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
    const configStore = useConfigStore()

    try {
      // Set composite projection ID
      configStore.compositeProjection = config.projectionId

      // Note: Global scale for built-in-composite mode is not yet fully supported
      // d3-composite-projections doesn't expose a scale multiplier API
      if (config.globalScale !== undefined) {
        console.info('[PresetApplicationService] Global scale from preset (not applied):', config.globalScale)
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
