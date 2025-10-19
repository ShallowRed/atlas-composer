/**
 * Preset Loader Service
 *
 * Loads preset composite projection configurations from the configs/presets/ directory.
 * Presets provide high-quality default layouts that are applied automatically on atlas initialization.
 *
 * Key responsibilities:
 * - Load preset files from configs/presets/
 * - Orchestrate validation and conversion using core modules
 * - List available presets for an atlas
 * - Load preset metadata for UI display
 */

import type {
  ExtendedPresetConfig,
  PresetLoadResult,
} from '@/core/presets'
import {
  convertToDefaults,
  extractTerritoryParameters,
  validateCompositePreset,
} from '@/core/presets'

/**
 * Service for loading and managing preset configurations
 */
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

      // Validate using core validator
      return validateCompositePreset(jsonText, rawPreset)
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
   * Load preset metadata (name, version, metadata) without full validation
   * This is useful for populating dropdowns and lists without loading full configurations
   *
   * @param presetId - Preset identifier (e.g., 'france-default', 'portugal-default')
   * @returns Preset metadata or null if loading failed
   */
  static async loadPresetMetadata(presetId: string): Promise<{ name?: string | Record<string, string>, metadata?: any } | null> {
    try {
      // Construct preset file path
      const baseUrl = import.meta.env.BASE_URL
      const presetPath = `${baseUrl}configs/presets/${presetId}.json`

      // Fetch preset file
      const response = await fetch(presetPath)

      if (!response.ok) {
        console.warn(`[PresetLoader] Failed to load metadata for preset '${presetId}': ${response.statusText}`)
        return null
      }

      // Parse only the parts we need (name and metadata)
      const jsonText = await response.text()
      const preset = JSON.parse(jsonText)

      return {
        name: preset.name,
        metadata: preset.metadata,
      }
    }
    catch (error) {
      console.warn(`[PresetLoader] Error loading metadata for preset '${presetId}':`, error)
      return null
    }
  }

  // Re-export core converters for backward compatibility
  static convertToDefaults = convertToDefaults
  static extractTerritoryParameters = extractTerritoryParameters
}
