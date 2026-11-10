import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { validateCompositePreset, validateViewPreset } from '@/core/presets/validator'

describe('presets of configs/presets', () => {
  it.each(readPresetFiles())('$path is valid', ({ type, json }) => {
    const file = JSON.parse(json)
    const validation = type === 'composite-custom'
      ? validateCompositePreset(file)
      : validateViewPreset(file)

    expect(validation).toMatchObject({ ok: true })
  })
})
