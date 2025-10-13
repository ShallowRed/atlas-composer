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

export interface PresetLoadResult {
  success: boolean
  preset?: ExportedCompositeConfig
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

      console.info(`[PresetLoader] Loading preset from: ${presetPath}`)

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
      console.info(`[PresetLoader] Preset file loaded, validating...`)

      // Validate using CompositeImportService
      const importResult: ImportResult = CompositeImportService.importFromJSON(jsonText)

      if (!importResult.success) {
        return {
          success: false,
          errors: importResult.errors,
          warnings: importResult.warnings,
        }
      }

      // Return validated preset
      return {
        success: true,
        preset: importResult.config,
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
   * Validate a preset configuration
   *
   * Uses the same validation as CompositeImportService to ensure
   * preset files conform to the expected format.
   *
   * @param preset - Preset configuration to validate
   * @returns Validation result with errors and warnings
   */
  static validatePreset(preset: ExportedCompositeConfig): PresetLoadResult {
    const validationResult = CompositeImportService.importFromJSON(JSON.stringify(preset))

    return {
      success: validationResult.success,
      preset: validationResult.config,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    }
  }
}
