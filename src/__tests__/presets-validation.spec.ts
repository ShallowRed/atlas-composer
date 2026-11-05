import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { validatePreset } from '@/core/presets/validator'

describe('presets of configs/presets', () => {
  it.each(readPresetFiles())('$path is valid', ({ type, json }) => {
    const result = validatePreset(JSON.parse(json), type, json)

    expect(result.errors).toEqual([])
    expect(result.isValid).toBe(true)
  })
})
