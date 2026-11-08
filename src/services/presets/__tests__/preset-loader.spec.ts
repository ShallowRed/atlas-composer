import type { AtlasId } from '@/types/branded'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'
import { err } from '@/core/types/result'
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

function issuesOf(result: Awaited<ReturnType<typeof PresetLoader.loadPreset>>) {
  return !result.ok && result.error.code === 'PRESET_INVALID' ? result.error.issues : []
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

    expect(result).toMatchObject({ ok: true, value: { id: presetId, atlasId: FRANCE } })
  })

  it('refuses a preset that the registry does not declare', async () => {
    await startApplication(FRANCE)

    const result = await PresetLoader.loadPreset(createPresetId('france-nothing'))

    expect(result).toEqual(err({ code: 'PRESET_UNKNOWN', presetId: 'france-nothing' }))
  })

  it('reports the file that does not load', async () => {
    await startApplication(FRANCE)
    const { path } = readPresetFiles().find(({ id }) => id === COMPOSITE_PRESET)!
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))

    const result = await PresetLoader.loadPreset(COMPOSITE_PRESET)

    expect(result).toEqual(err({ code: 'JSON_FILE_NOT_FOUND', path: `/${path}` }))
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

    expect(issuesOf(result)).toEqual([{ code: 'PRESET_POSITIONING_REQUIRED', territory: 'FR-MET' }])
  })

  it('refuses a view preset without projection', async () => {
    await startApplication(FRANCE)
    stubPresetFile(preset => ({ ...preset, config: {} }))

    const result = await PresetLoader.loadPreset(UNIFIED_PRESET)

    expect(issuesOf(result)).toEqual([{ code: 'PRESET_PROJECTION_MISSING' }])
  })

  it('refuses a view preset without config', async () => {
    await startApplication(FRANCE)
    stubPresetFile(({ config: _config, ...preset }) => preset)

    const result = await PresetLoader.loadPreset(UNIFIED_PRESET)

    expect(issuesOf(result)).toEqual([{ code: 'PRESET_FIELD_MISSING', field: 'config' }])
  })

  it('refuses a split preset with an empty territory', async () => {
    await startApplication(FRANCE)
    stubPresetFile(preset => ({ ...preset, config: { territories: { 'FR-MET': null } } }))

    const result = await PresetLoader.loadPreset(SPLIT_PRESET)

    expect(issuesOf(result)).toEqual([{ code: 'PRESET_PROJECTION_ID_INVALID', territory: 'FR-MET' }])
  })

  it.each([
    [UNIFIED_PRESET, { code: 'PRESET_FIELD_MISSING', field: 'config' }],
    [COMPOSITE_PRESET, { code: 'PRESET_SCHEMA_INVALID_TYPE', path: '/' }],
  ])('refuses a file of %s that contains null', async (presetId, issue) => {
    await startApplication(FRANCE)
    stubPresetFile(() => null)

    const result = await PresetLoader.loadPreset(presetId)

    expect(issuesOf(result)).toContainEqual(issue)
  })
})
