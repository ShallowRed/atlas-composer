/**
 * Preset Loader Service
 *
 * Loads preset composite projection configurations from the configs/presets/ directory.
 * Presets provide high-quality default layouts that are applied automatically on atlas initialization.
 *
 * Key responsibilities:
 * - Load preset files from configs/presets/
 * - Validate preset format using CompositeImportService
 * - Convert presets to territory defaults format
 * - List available presets for an atlas
 */

import type { TerritoryDefaults } from '@/services/atlas/territory-defaults-service'
import type { ImportResult } from '@/services/export/composite-import-service'
import type { ExportedCompositeConfig } from '@/types/export-config'

import { CompositeImportService } from '@/services/export/composite-import-service'

/**
 * Atlas projection metadata extracted from atlas configuration
 */
export interface AtlasProjectionMetadata {
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: {
    recommended?: string[]
    default?: {
      mainland?: string
      overseas?: string
    }
    prohibited?: string[]
  }
  projectionParameters?: {
    center?: { longitude: number, latitude: number }
    rotate?: {
      mainland?: [number, number]
      azimuthal?: [number, number]
    }
    parallels?: { conic?: [number, number] }
  }
  mapDisplayDefaults?: {
    showGraticule?: boolean
    showSphere?: boolean
    showCompositionBorders?: boolean
    showMapLimits?: boolean
  }
}

/**
 * Extended preset configuration with atlas metadata
 */
export interface ExtendedPresetConfig extends ExportedCompositeConfig {
  /** Optional atlas-level projection metadata */
  atlasMetadata?: AtlasProjectionMetadata
}

export interface PresetLoadResult {
  success: boolean
  preset?: ExtendedPresetConfig
  errors: string[]
  warnings: string[]
}

/**
 * Service for loading and managing preset configurations
 */
export class PresetLoader {
  /**
   * Load a preset configuration file
   *
   * @param presetId - Preset identifier (e.g., 'france-default', 'portugal-default')
   * @returns Load result with parsed preset and validation messages
   */
  static async loadPreset(presetId: string): Promise<PresetLoadResult> {
    try {
      // Construct preset file path
      const baseUrl = import.meta.env.BASE_URL
      const presetPath = `${baseUrl}configs/presets/${presetId}.json`

      // Fetch preset file
      const response = await fetch(presetPath)

      if (!response.ok) {
        console.error(`[PresetLoader] HTTP ${response.status}: ${response.statusText}`)
        return {
          success: false,
          errors: [`Failed to load preset '${presetId}': ${response.statusText}`],
          warnings: [],
        }
      }

      // Parse JSON
      const jsonText = await response.text()
      const rawPreset = JSON.parse(jsonText) as ExtendedPresetConfig

      // Validate using CompositeImportService
      const importResult: ImportResult = CompositeImportService.importFromJSON(jsonText)

      if (!importResult.success) {
        return {
          success: false,
          errors: importResult.errors,
          warnings: importResult.warnings,
        }
      }

      // Combine validated preset with atlas metadata
      const extendedPreset: ExtendedPresetConfig = {
        ...importResult.config!,
        atlasMetadata: rawPreset.atlasMetadata,
      }

      // Return validated preset
      return {
        success: true,
        preset: extendedPreset,
        errors: [],
        warnings: importResult.warnings,
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Unexpected error loading preset '${presetId}': ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      }
    }
  }

  /**
   * List available presets for a given atlas
   *
   * Note: This is a static list based on atlas configuration.
   * In a future enhancement, this could scan the presets directory.
   *
   * @returns Array of preset IDs available for this atlas
   */
  static listAvailablePresets(): string[] {
    // For now, return empty array - presets will be defined in atlas config
    // In the future, this could scan the presets directory dynamically
    return []
  }

  /**
   * Convert a preset configuration to territory defaults format
   *
   * Territory defaults are used to initialize the store state with
   * projection, translation, and scale values for each territory.
   *
   * @param preset - Validated preset configuration
   * @returns Territory defaults for store initialization
   */
  static convertToDefaults(preset: ExportedCompositeConfig): TerritoryDefaults {
    const projections: Record<string, string> = {}
    const translations: Record<string, { x: number, y: number }> = {}
    const scales: Record<string, number> = {}

    // Extract values from each territory in the preset
    preset.territories.forEach((territory) => {
      const code = territory.code

      // Projection ID
      projections[code] = territory.projectionId

      // Translation offset
      translations[code] = {
        x: territory.layout.translateOffset[0],
        y: territory.layout.translateOffset[1],
      }

      // Scale multiplier
      scales[code] = territory.parameters.scaleMultiplier
    })

    return {
      projections,
      translations,
      scales,
    }
  }

  /**
   * Extract territory-specific projection parameters from preset
   *
   * Returns a map of territory code to projection parameters that should be
   * loaded into the parameter store for each territory.
   *
   * @param preset - Validated preset configuration
   * @returns Map of territory code to projection parameters
   */
  static extractTerritoryParameters(
    preset: ExportedCompositeConfig,
  ): Record<string, Record<string, unknown>> {
    const territoryParams: Record<string, Record<string, unknown>> = {}

    preset.territories.forEach((territory) => {
      const params: Record<string, unknown> = {}

      // Extract projection parameters that should be set at territory level
      // Note: scale is included here because it's a projection parameter, not a territory scale multiplier
      if (territory.parameters.center) {
        params.center = territory.parameters.center
      }
      if (territory.parameters.rotate) {
        params.rotate = territory.parameters.rotate
      }
      if (territory.parameters.parallels) {
        params.parallels = territory.parameters.parallels
      }
      if (territory.parameters.scale !== undefined) {
        // This is the D3 projection scale parameter, not the territory scale multiplier
        params.scale = territory.parameters.scale
      }
      if (territory.parameters.baseScale !== undefined) {
        // Extract baseScale for proper initialization of composite projections
        // The baseScale is the scale value before applying the scaleMultiplier
        params.baseScale = territory.parameters.baseScale
      }
      if (territory.parameters.scaleMultiplier !== undefined) {
        // Extract scaleMultiplier for proper initialization of composite projections
        // This is the multiplier applied to baseScale to get the final scale
        params.scaleMultiplier = territory.parameters.scaleMultiplier
      }
      if (territory.parameters.clipAngle !== undefined) {
        params.clipAngle = territory.parameters.clipAngle
      }
      if (territory.parameters.precision !== undefined) {
        params.precision = territory.parameters.precision
      }

      // Only add if there are parameters to set
      if (Object.keys(params).length > 0) {
        territoryParams[territory.code] = params
      }
    })

    return territoryParams
  }

  /**
   * Validate a preset configuration
   *
   * Uses the same validation as CompositeImportService to ensure
   * preset files conform to the expected format.
   *
   * @param preset - Preset configuration to validate
   * @returns Validation result with errors and warnings
   */
  static validatePreset(preset: ExtendedPresetConfig): PresetLoadResult {
    const validationResult = CompositeImportService.importFromJSON(JSON.stringify(preset))

    const extendedPreset: ExtendedPresetConfig = {
      ...validationResult.config!,
      atlasMetadata: preset.atlasMetadata,
    }

    return {
      success: validationResult.success,
      preset: extendedPreset,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    }
  }
}
