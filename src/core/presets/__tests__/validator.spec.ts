import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateViewPreset } from '@/core/presets/validator'

const debug = vi.hoisted(() => vi.fn())

vi.mock('@/utils/logger', async (importOriginal) => {
  const { logger } = await importOriginal<typeof import('@/utils/logger')>()
  return { logger: { ...logger, presets: { ...logger.presets, validator: debug } } }
})

function validateProjection(projectionId: string) {
  return validateViewPreset({
    id: 'preset',
    name: 'Preset',
    atlasId: 'usa',
    viewMode: 'built-in-composite',
    config: { projectionId },
  })
}

describe('validateViewPreset', () => {
  beforeEach(() => debug.mockClear())

  it('accepts a composite projection of the registry without a warning', () => {
    validateProjection('albers-usa')

    expect(debug).not.toHaveBeenCalled()
  })

  it('warns about a projection that is not a composite one', () => {
    validateProjection('mercator')

    expect(debug).toHaveBeenCalledWith('Preset warnings: %O', ['Unknown d3-composite-projection: mercator'])
  })
})
