import type { Preset } from '@/core/presets'
import type { PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { AtlasConfig, AtlasId } from '@/types'

import { getAvailableViewModes } from '@/core/atlases/registry'
import { err, ok } from '@/core/types/result'

export class PresetValidationService {
  static validatePreset(preset: Preset, atlasConfig: AtlasConfig): Result<void, PresetError> {
    // PresetLoader.loadPreset validates a composite-custom preset by validateCompositePreset
    if (preset.type === 'composite-custom' || getAvailableViewModes(atlasConfig.id as AtlasId).includes(preset.type)) {
      return ok(undefined)
    }

    return err({
      code: 'PRESET_INVALID',
      presetId: preset.id,
      issues: [{ code: 'PRESET_TYPE_NOT_SUPPORTED', presetType: preset.type, atlasId: atlasConfig.id }],
    })
  }
}
