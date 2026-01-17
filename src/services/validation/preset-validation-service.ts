/**
 * Preset Validation Service
 *
 * Validates presets and imported configurations before they are applied to stores.
 * Ensures data integrity and provides actionable error messages.
 */

import type { Preset } from '@/core/presets'
import type { AtlasConfig, AtlasId } from '@/types'

import type { ValidationResult } from '@/types/initialization'
import { getAvailableViewModes } from '@/core/atlases/registry'

/**
 * Service for validating presets and configurations
 */
export class PresetValidationService {
  /**
   * Validate a preset against an atlas configuration
   *
   * @param preset - Preset to validate
   * @param atlasConfig - Atlas configuration to validate against
   * @returns Validation result with errors and warnings
   */
  static validatePreset(preset: Preset, atlasConfig: AtlasConfig): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate preset type
    if (!preset.type) {
      errors.push('Preset is missing type field')
      return { isValid: false, errors, warnings }
    }

    // Validate composite-custom presets
    if (preset.type === 'composite-custom') {
      return this.validateCompositePreset(preset, atlasConfig)
    }

    // Validate view mode presets
    if (['unified', 'split', 'built-in-composite'].includes(preset.type)) {
      return this.validateViewPreset(preset, atlasConfig)
    }

    errors.push(`Unknown preset type: ${preset.type}`)
    return { isValid: false, errors, warnings }
  }

  private static validateCompositePreset(preset: Preset, _atlasConfig: AtlasConfig): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (preset.type !== 'composite-custom') {
      errors.push('Expected composite-custom preset')
      return { isValid: false, errors, warnings }
    }

    const config = preset.config as any

    // Validate territories exist
    if (!config.territories || Object.keys(config.territories).length === 0) {
      errors.push('Preset has no territories defined')
      return { isValid: false, errors, warnings }
    }

    // Check territory compatibility with atlas
    // Note: We allow presets to have fewer territories than atlas (intentional filtering)
    const presetTerritories = Object.keys(config.territories)
    const metadata = {
      territoriesInPreset: presetTerritories,
      territoriesInAtlas: [], // Would need AtlasService to get this
      missingTerritories: [],
      extraTerritories: [],
    }

    // Basic validation of territory structure
    for (const [code, territory] of Object.entries(config.territories) as any) {
      if (!territory.projection?.id) {
        errors.push(`Territory ${code} is missing projection.id`)
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings, metadata }
    }

    return { isValid: true, errors, warnings, metadata }
  }

  private static validateViewPreset(preset: Preset, atlasConfig: AtlasConfig): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if view mode is supported by atlas
    // Convert: atlasConfig.id from LoadedAtlasConfig
    const availableViewModes = getAvailableViewModes(atlasConfig.id as AtlasId)
    if (!availableViewModes.includes(preset.type as any)) {
      errors.push(`Preset type '${preset.type}' is not supported by atlas '${atlasConfig.id}'`)
      return { isValid: false, errors, warnings }
    }

    // Type-specific validation
    if (preset.type === 'unified') {
      const config = preset.config as any
      if (!config.projection?.id) {
        errors.push('Unified preset is missing projection.id')
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings }
    }

    return { isValid: true, errors, warnings }
  }

  static validateViewModeCompatibility(preset: Preset, viewMode: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (preset.type !== viewMode) {
      errors.push(`Preset type '${preset.type}' does not match view mode '${viewMode}'`)
      return { isValid: false, errors, warnings }
    }

    return { isValid: true, errors, warnings }
  }
}
