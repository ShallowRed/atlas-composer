/**
 * Preset Loader Service
 *
 * Loads preset composite projection configurations from the configs/presets/ directory.
 * Presets provide high-quality default layouts that are applied automatically on atlas initialization.
 *
 * Key responsibilities:
 * - Load preset files from configs/presets/
 * - Orchestrate validation and conversion using core modules
 * - Load and cache preset registry
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
import { PresetFileLoader } from './loaders/preset-file-loader'

/**
 * Preset registry structure
 */
interface PresetRegistry {
  version: string
  description?: string
  presets: Array<{
    id: string
    atlasId: string
    name: string | Record<string, string>
    description?: string | Record<string, string>
    pattern: string
    territories: number
  }>
}

/**
 * Service for loading and managing preset configurations
 */
export class PresetLoader {
  private static registry: PresetRegistry | null = null

  /**
   * Load the preset registry
   * Cached after first load
   */
  private static async loadRegistry(): Promise<PresetRegistry> {
    if (this.registry) {
      return this.registry
    }

    const result = await PresetFileLoader.loadRegistry<PresetRegistry>('configs/presets/registry.json')

    if (!result.success || !result.data) {
      console.warn('[PresetLoader] Failed to load preset registry, using empty registry')
      return { version: '1.0', presets: [] }
    }

    this.registry = result.data
    return this.registry
  }

  /**
   * Load a preset configuration file
   *
   * @param presetId - Preset identifier (e.g., 'france-default', 'portugal-default')
   * @returns Load result with parsed preset and validation messages
   */
  static async loadPreset(presetId: string): Promise<PresetLoadResult> {
    // Use PresetFileLoader for file loading
    const fileResult = await PresetFileLoader.loadJSON<ExtendedPresetConfig>(
      `configs/presets/${presetId}.json`,
    )

    if (!fileResult.success || !fileResult.data) {
      return {
        success: false,
        errors: fileResult.errors,
        warnings: fileResult.warnings,
      }
    }

    // Validate using core validator
    // Note: Validator needs both JSON text and parsed object
    const jsonText = JSON.stringify(fileResult.data)
    return validateCompositePreset(jsonText, fileResult.data)
  }

  /**
   * List available presets for a given atlas
   *
   * @param atlasId - Optional atlas ID to filter presets
   * @returns Array of preset metadata available for this atlas
   */
  static async listAvailablePresets(atlasId?: string): Promise<PresetRegistry['presets']> {
    const registry = await this.loadRegistry()

    if (!atlasId) {
      return registry.presets
    }

    return registry.presets.filter(preset => preset.atlasId === atlasId)
  }

  /**
   * Load preset metadata (name, version, metadata) without full validation
   * This is useful for populating dropdowns and lists without loading full configurations
   *
   * @param presetId - Preset identifier (e.g., 'france-default', 'portugal-default')
   * @returns Preset metadata or null if loading failed
   */
  static async loadPresetMetadata(presetId: string): Promise<{ name?: string | Record<string, string>, metadata?: any } | null> {
    // Try registry first (faster)
    try {
      const registry = await this.loadRegistry()
      const registryEntry = registry.presets.find(p => p.id === presetId)

      if (registryEntry) {
        return {
          name: registryEntry.name,
          metadata: {
            atlasId: registryEntry.atlasId,
            description: registryEntry.description,
          },
        }
      }
    }
    catch (error) {
      console.warn('[PresetLoader] Error loading registry for metadata:', error)
    }

    // Fallback: Load full preset file
    const result = await PresetFileLoader.loadJSON<ExtendedPresetConfig>(
      `configs/presets/${presetId}.json`,
    )

    if (!result.success || !result.data) {
      console.warn(`[PresetLoader] Failed to load metadata for preset '${presetId}':`, result.errors)
      return null
    }

    return {
      name: result.data.metadata?.atlasName,
      metadata: result.data.metadata,
    }
  }

  // Re-export core converters for backward compatibility
  static convertToDefaults = convertToDefaults
  static extractTerritoryParameters = extractTerritoryParameters
}
