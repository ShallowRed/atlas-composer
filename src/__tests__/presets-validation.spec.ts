import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { validatePreset } from '@/core/presets/validator'
import { err, ok } from '@/core/types/result'

describe('presets of configs/presets', () => {
  it.each(readPresetFiles())('$path is valid', ({ type, json }) => {
    expect(validatePreset(JSON.parse(json), type)).toEqual(ok(undefined))
  })

  it('refuses a composite preset with a territory without rotate nor center', () => {
    const { json } = readPresetFiles().find(({ type }) => type === 'composite-custom')!
    const preset = JSON.parse(json)
    const [territory] = preset.territories
    delete territory.projection.parameters.rotate
    delete territory.projection.parameters.center

    expect(validatePreset(preset, 'composite-custom'))
      .toEqual(err([{ code: 'PRESET_POSITIONING_REQUIRED', territory: territory.code }]))
  })
})
