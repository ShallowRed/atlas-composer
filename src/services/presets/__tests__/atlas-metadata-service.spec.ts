import type { Preset } from '@/core/presets'
import type { AtlasId, PresetId } from '@/types/branded'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultCompositeProjections } from '@/core/projections/defaults'
import { err, ok } from '@/core/types/result'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
import { PresetLoader } from '@/services/presets/preset-loader'

const FRANCE = 'france' as AtlasId

function compositePreset(): Preset {
  return {
    id: 'preset-x',
    atlasId: FRANCE,
    type: 'composite-custom',
    config: {
      atlasMetadata: {
        compositeProjections: ['conic-conformal-europe'],
        projectionPreferences: { recommended: ['mercator'] },
      },
    },
  } as unknown as Preset
}

describe('atlasMetadataService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the metadata of a composite preset', async () => {
    vi.spyOn(PresetLoader, 'loadPreset').mockResolvedValue(ok(compositePreset()))
    const presetId = 'france-with-metadata' as PresetId

    expect(await AtlasMetadataService.getDefaultCompositeProjection(FRANCE, presetId)).toBe('conic-conformal-europe')
    expect(await AtlasMetadataService.getRecommendedProjection(FRANCE, presetId)).toBe('mercator')
  })

  it('gives the fallback metadata when the preset does not load', async () => {
    vi.spyOn(PresetLoader, 'loadPreset').mockResolvedValue(err({ code: 'PRESET_UNKNOWN', presetId: 'preset-x' }))
    const presetId = 'france-without-file' as PresetId

    expect(await AtlasMetadataService.getDefaultCompositeProjection(FRANCE, presetId)).toBe(getDefaultCompositeProjections(FRANCE)[0])
    expect(await AtlasMetadataService.getRecommendedProjection(FRANCE, presetId)).toBe('natural-earth')
  })

  it.each([
    ['a view preset', 'france-view', { id: 'preset-x', atlasId: FRANCE, type: 'unified', config: {} }],
    ['a composite preset without metadata', 'france-bare', { id: 'preset-x', atlasId: FRANCE, type: 'composite-custom', config: {} }],
  ])('gives the fallback metadata for %s', async (_name, presetId, preset) => {
    vi.spyOn(PresetLoader, 'loadPreset').mockResolvedValue(ok(preset as unknown as Preset))

    expect(await AtlasMetadataService.getRecommendedProjection(FRANCE, presetId as PresetId)).toBe('natural-earth')
  })

  it('gives the fallback metadata without a preset', async () => {
    const loadPreset = vi.spyOn(PresetLoader, 'loadPreset')

    expect(await AtlasMetadataService.getRecommendedProjection(FRANCE)).toBe('natural-earth')
    expect(loadPreset).not.toHaveBeenCalled()
  })
})
