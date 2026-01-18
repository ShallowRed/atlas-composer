import type { Preset } from '@/core/presets'
import type { AtlasConfig, AtlasId } from '@/types'

import type { ValidationResult } from '@/types/initialization'
import { getAvailableViewModes } from '@/core/atlases/registry'

export class PresetValidationService {
  static validatePreset(preset: Preset, atlasConfig: AtlasConfig): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!preset.type) {
      errors.push('Preset is missing type field')
      return { isValid: false, errors, warnings }
    }

    if (preset.type === 'composite-custom') {
      return this.validateCompositePreset(preset, atlasConfig)
    }

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

    if (!config.territories || Object.keys(config.territories).length === 0) {
      errors.push('Preset has no territories defined')
      return { isValid: false, errors, warnings }
    }

    const presetTerritories = Object.keys(config.territories)
    const metadata = {
      territoriesInPreset: presetTerritories,
      territoriesInAtlas: [],
      missingTerritories: [],
      extraTerritories: [],
    }

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

    const availableViewModes = getAvailableViewModes(atlasConfig.id as AtlasId)
    if (!availableViewModes.includes(preset.type as any)) {
      errors.push(`Preset type '${preset.type}' is not supported by atlas '${atlasConfig.id}'`)
      return { isValid: false, errors, warnings }
    }

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
