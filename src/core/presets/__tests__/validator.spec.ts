import type { AtlasId } from '@/types/branded'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateViewPreset } from '@/core/presets/validator'
import { createPresetId } from '@/types/branded'

const debug = vi.hoisted(() => vi.fn())

vi.mock('@/utils/logger', async (importOriginal) => {
  const { logger } = await importOriginal<typeof import('@/utils/logger')>()
  return { logger: { ...logger, presets: { ...logger.presets, validator: debug } } }
})

function validateProjection(projectionId: string) {
  return validateViewPreset({
    id: createPresetId('preset'),
    atlasId: 'usa' as AtlasId,
    type: 'built-in-composite',
    config: { projectionId },
  })
}

describe('validateViewPreset', () => {
  beforeEach(() => debug.mockClear())

  it('accepts a composite projection of the registry without a warning', () => {
    validateProjection('albers-usa')

    expect(debug).not.toHaveBeenCalled()
  })

  it.each(['mercator', 'unknown'])('warns about %s, which is not a composite projection', (projectionId) => {
    validateProjection(projectionId)

    expect(debug).toHaveBeenCalledWith('Preset warnings: %O', [`Unknown d3-composite-projection: ${projectionId}`])
  })
})
