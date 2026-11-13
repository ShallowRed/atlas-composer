import type { Preset, ViewPreset } from '@/core/presets'
import type { PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { PresetId } from '@/types'

import { findPresetById, resolveConfigPath } from '@/core/atlases/registry'
import {
  validateCompositePreset,
  validateViewPreset,
} from '@/core/presets'
import { err, ok } from '@/core/types/result'
import { JsonFileLoader } from '@/services/data/json-file-loader'

export class PresetLoader {
  static async loadPreset(presetId: PresetId): Promise<Result<Preset, PresetError>> {
    const found = findPresetById(presetId)
    if (!found?.preset.configPath) {
      return err({ code: 'PRESET_UNKNOWN', presetId })
    }
    const { atlasId, preset: presetDef } = found

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

    const preset: ViewPreset = { id: presetId, atlasId, type: presetDef.type, config: file.config }
    const validation = validateViewPreset(preset)
    if (!validation.ok) {
      return err({ code: 'PRESET_INVALID', presetId, issues: validation.error })
    }

    return ok(preset)
  }
}
