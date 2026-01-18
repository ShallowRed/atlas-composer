import type {
  CompositeCustomConfig,
  LoadResult,
  Preset,
} from '@/core/presets'
import type { AtlasId, PresetId } from '@/types'

import { getCurrentLocale, resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getPresetById } from '@/core/atlases/registry'
import {
  convertToDefaults,
  extractTerritoryParameters,
  validateCompositePreset,
  validateViewPreset,
} from '@/core/presets'
import { PresetFileLoader } from '@/services/presets/loaders/preset-file-loader'

export class PresetLoader {
  static async loadPreset(presetId: PresetId): Promise<LoadResult<Preset>> {
    const atlasId = presetId.split('-')[0] as AtlasId | undefined
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

    if (!presetDef.configPath) {
      return {
        success: false,
        errors: [`Preset '${presetId}' has no configPath defined in atlas registry`],
        warnings: [],
      }
    }

    const relativePath = presetDef.configPath.replace(/^\.\//, 'configs/')
    const fileResult = await PresetFileLoader.loadJSON<any>(relativePath)

    if (!fileResult.success || !fileResult.data) {
      return {
        success: false,
        errors: fileResult.errors,
        warnings: fileResult.warnings,
      }
    }

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

      const locale = getCurrentLocale()
      const name = resolveI18nValue(presetDef.name, locale)
      const description = presetDef.description ? resolveI18nValue(presetDef.description, locale) : undefined

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

      const locale = getCurrentLocale()
      const name = resolveI18nValue(presetDef.name, locale)
      const description = presetDef.description ? resolveI18nValue(presetDef.description, locale) : undefined

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

  static convertToDefaults = convertToDefaults
  static extractTerritoryParameters = extractTerritoryParameters
}
