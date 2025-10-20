/**
 * Preset Loader Service (Unified)
 *
 * Loads all preset types (composite-custom, unified, split, built-in-composite)
 * from a single unified registry and directory structure.
 *
 * Key responsibilities:
 * - Load preset files from configs/presets/
 * - Orchestrate validation using core modules
 * - Load and cache unified preset registry
 * - Provide filtered preset lists by type/atlas/view mode
 */

import type {
  CompositeCustomConfig,
  LoadResult,
  Preset,
  PresetRegistry,
  PresetType,
  ViewPresetMode,
} from '@/core/presets'
import {
  convertToDefaults,
  extractTerritoryParameters,
  validateCompositePreset,
  validateViewPreset,
} from '@/core/presets'
import { PresetFileLoader } from './loaders/preset-file-loader'

/**
 * Unified service for loading and managing all preset types
 */
export class PresetLoader {
  private static registry: PresetRegistry | null = null

  /**
   * Load the unified preset registry
   * Cached after first load
   */
  private static async loadRegistry(): Promise<PresetRegistry> {
    if (this.registry) {
      return this.registry
    }

    const result = await PresetFileLoader.loadRegistry<PresetRegistry>(
      'configs/presets/registry.json',
    )

    if (!result.success || !result.data) {
      console.warn('[PresetLoader] Failed to load preset registry, using empty registry')
      return { version: '2.0', presets: [] }
    }

    this.registry = result.data
    return this.registry
  }

  /**
   * Load a preset configuration file (any type)
   *
   * @param presetId - Preset identifier (e.g., 'france-default', 'france-unified')
   * @returns Load result with parsed preset and validation messages
   */
  static async loadPreset(presetId: string): Promise<LoadResult<Preset>> {
    // Get preset type from registry
    const registry = await this.loadRegistry()
    const registryEntry = registry.presets.find(p => p.id === presetId)

    if (!registryEntry) {
      return {
        success: false,
        errors: [`Preset '${presetId}' not found in registry`],
        warnings: [],
      }
    }

    // Load preset file
    const fileResult = await PresetFileLoader.loadJSON<any>(
      `configs/presets/${presetId}.json`,
    )

    if (!fileResult.success || !fileResult.data) {
      return {
        success: false,
        errors: fileResult.errors,
        warnings: fileResult.warnings,
      }
    }

    // Validate based on type
    if (registryEntry.type === 'composite-custom') {
      const jsonText = JSON.stringify(fileResult.data)
      const validation = validateCompositePreset(jsonText, fileResult.data)

      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        }
      }

      // Build Preset object
      const preset: Preset = {
        id: presetId,
        name: registryEntry.name,
        description: registryEntry.description,
        atlasId: registryEntry.atlasId,
        type: 'composite-custom',
        config: fileResult.data as CompositeCustomConfig,
      }

      return {
        success: true,
        data: preset,
        errors: [],
        warnings: validation.warnings,
      }
    }
    else {
      // View preset (unified, split, built-in-composite)
      const validation = validateViewPreset(fileResult.data)

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        }
      }

      // Build Preset object
      const preset: Preset = {
        id: presetId,
        name: registryEntry.name,
        description: registryEntry.description,
        atlasId: registryEntry.atlasId,
        type: registryEntry.type,
        config: fileResult.data.config,
      } as Preset

      return {
        success: true,
        data: preset,
        errors: [],
        warnings: validation.warnings,
      }
    }
  }

  /**
   * List all available presets
   *
   * @param filters - Optional filters
   * @param filters.atlasId - Filter by atlas ID
   * @param filters.type - Filter by preset type
   * @param filters.viewMode - Filter by view mode
   * @returns Array of preset metadata
   */
  static async listPresets(filters?: {
    atlasId?: string
    type?: PresetType
    viewMode?: ViewPresetMode
  }): Promise<PresetRegistry['presets']> {
    const registry = await this.loadRegistry()
    let presets = registry.presets

    if (filters?.atlasId) {
      presets = presets.filter(p => p.atlasId === filters.atlasId)
    }

    if (filters?.type) {
      presets = presets.filter(p => p.type === filters.type)
    }

    if (filters?.viewMode) {
      presets = presets.filter(p => p.type === filters.viewMode)
    }

    return presets
  }

  /**
   * Load preset metadata without full validation
   * Useful for populating dropdowns and lists
   *
   * @param presetId - Preset identifier
   * @returns Preset metadata or null if not found
   */
  static async loadMetadata(presetId: string): Promise<{ name: string, description?: string, atlasId: string, type: PresetType } | null> {
    const registry = await this.loadRegistry()
    const entry = registry.presets.find(p => p.id === presetId)

    if (!entry) {
      console.warn(`[PresetLoader] Preset '${presetId}' not found in registry`)
      return null
    }

    return {
      name: entry.name,
      description: entry.description,
      atlasId: entry.atlasId,
      type: entry.type,
    }
  }

  // Re-export core converters for backward compatibility
  static convertToDefaults = convertToDefaults
  static extractTerritoryParameters = extractTerritoryParameters
}
