import type { AtlasId } from '@/types/branded'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'
import { PresetLoader } from '@/services/presets/preset-loader'
import { createPresetId } from '@/types/branded'

const FRANCE = 'france' as AtlasId
const COMPOSITE_PRESET = createPresetId('france-standard')
const UNIFIED_PRESET = createPresetId('france-unified')
const SPLIT_PRESET = createPresetId('france-split')

function stubPresetFile(rewrite: (preset: any) => unknown) {
  vi.stubGlobal('fetch', async (url: string) =>
    new Response(JSON.stringify(rewrite(JSON.parse(await readFile(`.${url}`, 'utf8'))))))
}

describe('loadPreset', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([COMPOSITE_PRESET, UNIFIED_PRESET])('loads the preset %s', async (presetId) => {
    await startApplication(FRANCE)
    stubPresetFile(preset => preset)

    const result = await PresetLoader.loadPreset(presetId)

    expect(result).toMatchObject({ success: true, data: { id: presetId, atlasId: FRANCE } })
  })

  it('refuses a preset that the registry does not declare', async () => {
    await startApplication(FRANCE)

    const result = await PresetLoader.loadPreset(createPresetId('france-nothing'))

    expect(result.success).toBe(false)
    expect(result.errors.join()).toContain('france-nothing')
  })

  it('reports the file that does not load', async () => {
    await startApplication(FRANCE)
    const { path } = readPresetFiles().find(({ id }) => id === COMPOSITE_PRESET)!
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))

    const result = await PresetLoader.loadPreset(COMPOSITE_PRESET)

    expect(result.success).toBe(false)
    expect(result.errors.join()).toContain(path)
  })

  it('refuses a composite preset with a territory without rotate nor center', async () => {
    await startApplication(FRANCE)
    stubPresetFile((preset) => {
      const [territory] = preset.territories
      delete territory.projection.parameters.rotate
      delete territory.projection.parameters.center
      return preset
    })

    const result = await PresetLoader.loadPreset(COMPOSITE_PRESET)

    expect(result.success).toBe(false)
    expect(result.errors).toEqual(['PRESET_POSITIONING_REQUIRED'])
  })

  it('refuses a view preset without projection', async () => {
    await startApplication(FRANCE)
    stubPresetFile(preset => ({ ...preset, config: {} }))

    const result = await PresetLoader.loadPreset(UNIFIED_PRESET)

    expect(result.success).toBe(false)
    expect(result.errors).toEqual(['PRESET_PROJECTION_MISSING'])
  })

  it('refuses a view preset without config', async () => {
    await startApplication(FRANCE)
    stubPresetFile(({ config: _config, ...preset }) => preset)

    const result = await PresetLoader.loadPreset(UNIFIED_PRESET)

    expect(result.errors).toEqual(['PRESET_FIELD_MISSING'])
  })

  it('refuses a split preset with an empty territory', async () => {
    await startApplication(FRANCE)
    stubPresetFile(preset => ({ ...preset, config: { territories: { 'FR-MET': null } } }))

    const result = await PresetLoader.loadPreset(SPLIT_PRESET)

    expect(result.errors).toEqual(['PRESET_PROJECTION_ID_INVALID'])
  })

  it('refuses a file that contains null', async () => {
    await startApplication(FRANCE)
    stubPresetFile(() => null)

    const result = await PresetLoader.loadPreset(UNIFIED_PRESET)

    expect(result.success).toBe(false)
  })
})
