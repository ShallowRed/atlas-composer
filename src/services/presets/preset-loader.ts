import type { Preset } from '@/core/presets'
import type { PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { AtlasId, PresetId } from '@/types'

import { getPresetById, resolveConfigPath } from '@/core/atlases/registry'
import {
  validateCompositePreset,
  validateViewPreset,
} from '@/core/presets'
import { err, ok } from '@/core/types/result'
import { JsonFileLoader } from '@/services/data/json-file-loader'

export class PresetLoader {
  static async loadPreset(presetId: PresetId): Promise<Result<Preset, PresetError>> {
    const atlasId = presetId.split('-')[0] as AtlasId | undefined
    const presetDef = atlasId ? getPresetById(atlasId, presetId) : undefined
    if (!atlasId || !presetDef?.configPath) {
      return err({ code: 'PRESET_UNKNOWN', presetId })
    }

    const fileResult = await JsonFileLoader.loadJSON<any>(resolveConfigPath(presetDef.configPath))
    if (!fileResult.ok) {
      return fileResult
    }

    const file = fileResult.value

    if (presetDef.type === 'composite-custom') {
      const validation = validateCompositePreset(file)
      if (!validation.ok) {
        return err({ code: 'PRESET_INVALID', presetId, issues: validation.error })
      }

      return ok({
        id: presetId,
        atlasId,
        type: 'composite-custom',
        config: validation.value,
      })
    }

    const validation = validateViewPreset({
      ...file,
      viewMode: presetDef.type as 'unified' | 'split' | 'built-in-composite',
    })
    if (!validation.ok) {
      return err({ code: 'PRESET_INVALID', presetId, issues: validation.error })
    }

    return ok({
      id: presetId,
      atlasId,
      type: presetDef.type,
      config: file.config,
    } as Preset)
  }
}
