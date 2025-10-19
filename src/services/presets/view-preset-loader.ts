/**
 * View Preset Loader Service
 *
 * Loads preset configurations for unified, split, and composite-existing view modes.
 * These are SEPARATE from composite-custom presets to maintain independence.
 *
 * Key responsibilities:
 * - Load view preset files from configs/view-presets/
 * - Validate preset format against schema
 * - List available presets for a view mode
 * - Apply preset configurations to stores
 *
 * NOTE: Composite-custom presets use the separate PresetLoader service.
 */

import type {
  CompositeExistingViewConfig,
  SplitViewConfig,
  UnifiedViewConfig,
  ViewModePreset,
  ViewPresetLoadResult,
  ViewPresetMode,
  ViewPresetRegistry,
} from '@/types/view-preset'

import { parameterRegistry } from '@/core/parameters'
import { projectionRegistry } from '@/core/projections/registry'

/**
 * Service for loading and managing view mode presets
 */
export class ViewPresetLoader {
  private static registry: ViewPresetRegistry | null = null

  /**
   * Load the view preset registry
   * Cached after first load
   */
  private static async loadRegistry(): Promise<ViewPresetRegistry> {
    if (this.registry) {
      return this.registry
    }

    try {
      const baseUrl = import.meta.env.BASE_URL
      const registryPath = `${baseUrl}configs/view-presets/registry.json`
      const response = await fetch(registryPath)

      if (!response.ok) {
        throw new Error(`Failed to load registry: ${response.statusText}`)
      }

      this.registry = await response.json()
      return this.registry!
    }
    catch (error) {
      console.error('[ViewPresetLoader] Failed to load registry:', error)
      return { version: '1.0', presets: [] }
    }
  }

  /**
   * Load a view preset configuration file
   *
   * @param presetId - Preset identifier (e.g., 'france-unified-default')
   * @returns Load result with parsed preset and validation messages
   */
  static async loadPreset(presetId: string): Promise<ViewPresetLoadResult> {
    try {
      const baseUrl = import.meta.env.BASE_URL
      const presetPath = `${baseUrl}configs/view-presets/${presetId}.json`

      // Fetch preset file
      const response = await fetch(presetPath)

      if (!response.ok) {
        console.error(`[ViewPresetLoader] HTTP ${response.status}: ${response.statusText}`)
        return {
          success: false,
          errors: [`Failed to load view preset '${presetId}': ${response.statusText}`],
          warnings: [],
        }
      }

      // Parse JSON
      const preset = await response.json() as ViewModePreset

      // Validate preset structure
      const validation = this.validatePreset(preset)
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        }
      }

      return {
        success: true,
        preset,
        errors: [],
        warnings: validation.warnings,
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Unexpected error loading view preset '${presetId}': ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      }
    }
  }

  /**
   * Get all available view presets for an atlas and view mode
   *
   * @param atlasId - Atlas identifier
   * @param viewMode - View mode to filter by (optional)
   * @returns List of available presets
   */
  static async getAvailablePresets(
    atlasId: string,
    viewMode?: ViewPresetMode,
  ): Promise<ViewPresetRegistry['presets']> {
    const registry = await this.loadRegistry()

    return registry.presets.filter(preset =>
      preset.atlasId === atlasId
      && (viewMode === undefined || preset.viewMode === viewMode),
    )
  }

  /**
   * Validate a view preset
   *
   * @param preset - Preset to validate
   * @returns Validation result with errors and warnings
   */
  private static validatePreset(preset: ViewModePreset): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate required fields
    if (!preset.id) {
      errors.push('Missing required field: id')
    }
    if (!preset.name) {
      errors.push('Missing required field: name')
    }
    if (!preset.atlasId) {
      errors.push('Missing required field: atlasId')
    }
    if (!preset.viewMode) {
      errors.push('Missing required field: viewMode')
    }
    if (!preset.config) {
      errors.push('Missing required field: config')
    }

    // Validate view mode
    const validViewModes: ViewPresetMode[] = ['unified', 'split', 'composite-existing']
    if (preset.viewMode && !validViewModes.includes(preset.viewMode)) {
      errors.push(`Invalid view mode: ${preset.viewMode}. Must be one of: ${validViewModes.join(', ')}`)
    }

    // Validate view mode-specific configuration
    if (preset.viewMode === 'unified') {
      this.validateUnifiedConfig(preset.config as UnifiedViewConfig, errors, warnings)
    }
    else if (preset.viewMode === 'split') {
      this.validateSplitConfig(preset.config as SplitViewConfig, errors, warnings)
    }
    else if (preset.viewMode === 'composite-existing') {
      this.validateCompositeExistingConfig(preset.config as CompositeExistingViewConfig, errors, warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate unified view configuration
   */
  private static validateUnifiedConfig(
    config: UnifiedViewConfig,
    errors: string[],
    warnings: string[],
  ): void {
    if (!config.projection) {
      errors.push('Unified config missing projection')
      return
    }

    if (!config.projection.id) {
      errors.push('Unified config missing projection.id')
      return
    }

    // Validate projection exists in registry
    const projection = projectionRegistry.get(config.projection.id)
    if (!projection) {
      errors.push(`Unknown projection: ${config.projection.id}`)
      return
    }

    // Validate parameters
    if (config.projection.parameters) {
      const family = projection.family
      const validationResults = parameterRegistry.validateParameters(
        config.projection.parameters,
        family,
      )

      for (const result of validationResults) {
        if (!result.isValid && result.error) {
          warnings.push(`Projection parameter: ${result.error}`)
        }
      }
    }
  }

  /**
   * Validate split view configuration
   * Always uses individual projections per territory
   */
  private static validateSplitConfig(
    config: SplitViewConfig,
    errors: string[],
    warnings: string[],
  ): void {
    // Validate mainland
    if (!config.mainland) {
      errors.push('Split config missing mainland')
      return
    }

    if (!config.mainland.projection?.id) {
      errors.push('Split mainland config missing projection.id')
      return
    }

    // Validate mainland projection
    const mainlandProjection = projectionRegistry.get(config.mainland.projection.id)
    if (!mainlandProjection) {
      errors.push(`Unknown mainland projection: ${config.mainland.projection.id}`)
    }
    else if (config.mainland.projection.parameters) {
      const validationResults = parameterRegistry.validateParameters(
        config.mainland.projection.parameters,
        mainlandProjection.family,
      )

      for (const result of validationResults) {
        if (!result.isValid && result.error) {
          warnings.push(`Mainland projection parameter: ${result.error}`)
        }
      }
    }

    // Validate territory projections
    if (!config.territories) {
      errors.push('Split config missing territories')
      return
    }

    for (const [code, territoryConfig] of Object.entries(config.territories)) {
      if (!territoryConfig.projection?.id) {
        errors.push(`Territory ${code} missing projection.id`)
        continue
      }

      const projection = projectionRegistry.get(territoryConfig.projection.id)
      if (!projection) {
        errors.push(`Territory ${code}: unknown projection ${territoryConfig.projection.id}`)
        continue
      }

      if (territoryConfig.projection.parameters) {
        const validationResults = parameterRegistry.validateParameters(
          territoryConfig.projection.parameters,
          projection.family,
        )

        for (const result of validationResults) {
          if (!result.isValid && result.error) {
            warnings.push(`Territory ${code} projection parameter: ${result.error}`)
          }
        }
      }
    }
  }

  /**
   * Validate composite-existing view configuration
   */
  private static validateCompositeExistingConfig(
    config: CompositeExistingViewConfig,
    errors: string[],
    warnings: string[],
  ): void {
    if (!config.projectionId) {
      errors.push('Composite-existing config missing projectionId')
      return
    }

    // Validate projection exists in d3-composite-projections
    const validProjections = [
      'conic-conformal-france',
      'conic-conformal-europe',
      'conic-conformal-portugal',
      'conic-conformal-spain',
      'conic-conformal-usa',
      'albersusa',
    ]

    if (!validProjections.includes(config.projectionId)) {
      warnings.push(
        `Unknown d3-composite-projection: ${config.projectionId}. `
        + `Valid options: ${validProjections.join(', ')}`,
      )
    }

    // Validate globalScale if present
    if (config.globalScale !== undefined) {
      if (typeof config.globalScale !== 'number') {
        errors.push('globalScale must be a number')
      }
      else if (config.globalScale <= 0) {
        errors.push('globalScale must be greater than 0')
      }
      else if (config.globalScale < 0.1 || config.globalScale > 10) {
        warnings.push('globalScale is outside recommended range (0.1 to 10)')
      }
    }
  }
}
