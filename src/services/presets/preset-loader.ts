/**
 * Preset Loader Service
 *
 * Loads all preset types (composite-custom, unified, split, built-in-composite)
 * from the atlas registry and preset files.
 *
 * Key responsibilities:
 * - Load preset files from configs/presets/
 * - Orchestrate validation using core modules
 * - Query preset metadata from atlas registry
 */

import type {
  CompositeCustomConfig,
  LoadResult,
  Preset,
} from '@/core/presets'

import { getCurrentLocale, resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getPresetById } from '@/core/atlases/registry'
import {
  convertToDefaults,
  extractTerritoryParameters,
  validateCompositePreset,
  validateViewPreset,
} from '@/core/presets'
import { PresetFileLoader } from '@/services/presets/loaders/preset-file-loader'

/**
 * Unified service for loading and managing all preset types
 */
export class PresetLoader {
  /**
   * Load a preset configuration file (any type)
   *
   * @param presetId - Preset identifier (e.g., 'france-default', 'france-unified')
   * @returns Load result with parsed preset and validation messages
   */
  static async loadPreset(presetId: string): Promise<LoadResult<Preset>> {
    // Find preset in atlas registry
    // Extract atlas ID from preset ID (e.g., 'france-default' -> 'france')
    const atlasId = presetId.split('-')[0]
    if (!atlasId) {
      return {
        success: false,
        errors: [`Invalid preset ID format: '${presetId}'`],
        warnings: [],
      }
    }

    const presetDef = getPresetById(atlasId, presetId)
    if (!presetDef) {
      return {
        success: false,
        errors: [`Preset '${presetId}' not found in atlas registry`],
        warnings: [],
      }
    }

    // Verify configPath is defined
    if (!presetDef.configPath) {
      return {
        success: false,
        errors: [`Preset '${presetId}' has no configPath defined in atlas registry`],
        warnings: [],
      }
    }

    // Load preset file using configPath from registry
    // Remove leading "./" from configPath (e.g., "./presets/france/france-default.json" -> "configs/presets/france/france-default.json")
    const relativePath = presetDef.configPath.replace(/^\.\//, 'configs/')
    const fileResult = await PresetFileLoader.loadJSON<any>(relativePath)

    if (!fileResult.success || !fileResult.data) {
      return {
        success: false,
        errors: fileResult.errors,
        warnings: fileResult.warnings,
      }
    }

    // Validate based on type
    if (presetDef.type === 'composite-custom') {
      const jsonText = JSON.stringify(fileResult.data)
      const validation = validateCompositePreset(jsonText, fileResult.data)

      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        }
      }

      // Resolve i18n name
      const locale = getCurrentLocale()
      const name = resolveI18nValue(presetDef.name, locale)
      const description = presetDef.description ? resolveI18nValue(presetDef.description, locale) : undefined

      // Build Preset object
      const preset: Preset = {
        id: presetId,
        name,
        description,
        atlasId,
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
      // Build validation data with viewMode from registry type
      const validationData = {
        ...fileResult.data,
        viewMode: presetDef.type as 'unified' | 'split' | 'built-in-composite',
      }

      const validation = validateViewPreset(validationData)

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        }
      }

      // Resolve i18n name
      const locale = getCurrentLocale()
      const name = resolveI18nValue(presetDef.name, locale)
      const description = presetDef.description ? resolveI18nValue(presetDef.description, locale) : undefined

      // Build Preset object
      const preset: Preset = {
        id: presetId,
        name,
        description,
        atlasId,
        type: presetDef.type,
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

  // Re-export core converters for backward compatibility
  static convertToDefaults = convertToDefaults
  static extractTerritoryParameters = extractTerritoryParameters
}
