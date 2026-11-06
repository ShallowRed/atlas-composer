import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { validatePreset } from '@/core/presets/validator'

describe('presets of configs/presets', () => {
  it.each(readPresetFiles())('$path is valid', ({ type, json }) => {
    const result = validatePreset(JSON.parse(json), type)

    expect(result.errors).toEqual([])
    expect(result.isValid).toBe(true)
  })

  it('refuses a composite preset with a territory without rotate nor center', () => {
    const { json } = readPresetFiles().find(({ type }) => type === 'composite-custom')!
    const preset = JSON.parse(json)
    const [territory] = preset.territories
    delete territory.projection.parameters.rotate
    delete territory.projection.parameters.center

    const result = validatePreset(preset, 'composite-custom')

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(`Territory ${territory.code}: missing required parameter rotate or center`)
  })
})
