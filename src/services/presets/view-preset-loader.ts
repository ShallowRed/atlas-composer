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

      // Validate preset using core validator
      const validation = validateViewPreset(preset)
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
      console.error('[ViewPresetLoader] Error loading preset:', error)
      return {
        success: false,
        errors: [`Failed to load preset: ${error instanceof Error ? error.message : 'Unknown error'}`],
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
}
