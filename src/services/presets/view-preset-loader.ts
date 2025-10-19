/**
 * View Preset Loader Service
 *
 * Loads preset configurations for unified, split, and composite-existing view modes.
 * These are SEPARATE from composite-custom presets to maintain independence.
 *
 * Key responsibilities:
 * - Load view preset files from configs/view-presets/
 * - Orchestrate validation using core modules
 * - List available presets for a view mode
 * - Apply preset configurations to stores
 *
 * NOTE: Composite-custom presets use the separate PresetLoader service.
 */

import type {
  ViewModePreset,
  ViewPresetLoadResult,
  ViewPresetMode,
  ViewPresetRegistry,
} from '@/core/presets'
import { validateViewPreset } from '@/core/presets'
import { PresetFileLoader } from './loaders/preset-file-loader'

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

    const result = await PresetFileLoader.loadRegistry<ViewPresetRegistry>(
      'configs/view-presets/registry.json',
    )

    if (!result.success || !result.data) {
      console.error('[ViewPresetLoader] Failed to load registry:', result.errors)
      return { version: '1.0', presets: [] }
    }

    this.registry = result.data
    return this.registry
  }

  /**
   * Load a view preset configuration file
   *
   * @param presetId - Preset identifier (e.g., 'france-unified-default')
   * @returns Load result with parsed preset and validation messages
   */
  static async loadPreset(presetId: string): Promise<ViewPresetLoadResult> {
    // Use PresetFileLoader for file loading
    const fileResult = await PresetFileLoader.loadJSON<ViewModePreset>(
      `configs/view-presets/${presetId}.json`,
    )

    if (!fileResult.success || !fileResult.data) {
      return {
        success: false,
        errors: fileResult.errors,
        warnings: fileResult.warnings,
      }
    }

    // Validate preset using core validator
    const validation = validateViewPreset(fileResult.data)
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
      }
    }

    return {
      success: true,
      preset: fileResult.data,
      errors: [],
      warnings: validation.warnings,
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
}
