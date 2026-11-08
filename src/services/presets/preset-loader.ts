import type {
  CompositeCustomConfig,
  LoadResult,
  Preset,
} from '@/core/presets'
import type { AtlasId, PresetId } from '@/types'

import { getPresetById, resolveConfigPath } from '@/core/atlases/registry'
import {
  validateCompositePreset,
  validateViewPreset,
} from '@/core/presets'
import { JsonFileLoader } from '@/services/data/json-file-loader'

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

    const relativePath = resolveConfigPath(presetDef.configPath)
    const fileResult = await JsonFileLoader.loadJSON<any>(relativePath)

    if (!fileResult.ok) {
      return {
        success: false,
        errors: [`${fileResult.error.code}: ${fileResult.error.path}`],
        warnings: [],
      }
    }

    const file = fileResult.value

    if (presetDef.type === 'composite-custom') {
      const validation = validateCompositePreset(file)

      if (!validation.ok) {
        return {
          success: false,
          errors: validation.error.map(issue => issue.code),
          warnings: [],
        }
      }

      const preset: Preset = {
        id: presetId,
        atlasId,
        type: 'composite-custom',
        config: file as CompositeCustomConfig,
      }

      return {
        success: true,
        data: preset,
        errors: [],
        warnings: [],
      }
    }
    else {
      const validationData = {
        ...file,
        viewMode: presetDef.type as 'unified' | 'split' | 'built-in-composite',
      }

      const validation = validateViewPreset(validationData)

      if (!validation.ok) {
        return {
          success: false,
          errors: validation.error.map(issue => issue.code),
          warnings: [],
        }
      }

      const preset: Preset = {
        id: presetId,
        atlasId,
        type: presetDef.type,
        config: file.config,
      } as Preset

      return {
        success: true,
        data: preset,
        errors: [],
        warnings: [],
      }
    }
  }
}
