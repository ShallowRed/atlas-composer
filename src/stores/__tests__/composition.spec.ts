import type { PresetError } from '@/core/types/errors'
import type { AtlasId, TerritoryCode } from '@/types/branded'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openView, startApplication } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'
import { err, ok } from '@/core/types/result'
import { JsonFileLoader } from '@/services/data/json-file-loader'
import { PresetLoader } from '@/services/presets/preset-loader'
import { PresetValidationService } from '@/services/validation/preset-validation-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useUIStore } from '@/stores/ui'
import { createPresetId } from '@/types/branded'

const FRANCE = 'france' as AtlasId

function stubFetchFailingOn(path: string) {
  vi.stubGlobal('fetch', async (url: string) => url.includes(path)
    ? new Response('', { status: 404 })
    : new Response(await readFile(`.${url}`, 'utf8')))
}

async function startMapViewWithMissingFile(notFoundPath: string) {
  await startApplication(FRANCE)
  const geoDataStore = useGeoDataStore()
  vi.mocked(geoDataStore.reinitialize).mockRestore()
  vi.mocked(geoDataStore.loadAllAtlasData).mockRestore()
  stubFetchFailingOn(notFoundPath)

  await useCompositionStore().startMapView()
  return geoDataStore
}

describe('composition store', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('initializeAtlas', () => {
    it('fails when the default preset does not load', async () => {
      await startApplication(FRANCE)
      vi.spyOn(PresetLoader, 'loadPreset').mockResolvedValueOnce(err({ code: 'PRESET_UNKNOWN', presetId: 'nonexistent' }))

      const result = await useCompositionStore().initializeAtlas()

      expect(result).toEqual(err({ code: 'PRESET_UNKNOWN', presetId: 'nonexistent' }))
      expect(useGeoDataStore().isReinitializing).toBe(false)
      expect(useAppStore().state).toBe('error')
    })

    it('fails when the default preset is invalid', async () => {
      await startApplication(FRANCE)
      await openView(FRANCE, 'split')
      vi.spyOn(PresetValidationService, 'validatePreset').mockReturnValueOnce(err({
        code: 'PRESET_INVALID',
        presetId: 'france-unified',
        issues: [{ code: 'PRESET_TYPE_NOT_SUPPORTED', presetType: 'unified', atlasId: 'france' }],
      }))

      const result = await useCompositionStore().initializeAtlas({ preserveViewMode: true })

      expect(result).toEqual(err({
        code: 'PRESET_INVALID',
        presetId: 'france-unified',
        issues: [{ code: 'PRESET_TYPE_NOT_SUPPORTED', presetType: 'unified', atlasId: 'france' }],
      }))
      expect(useGeoDataStore().isReinitializing).toBe(false)
      expect(useAppStore().state).toBe('error')
    })

    it('opens the selected atlas', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      const initializeAtlas = vi.spyOn(compositionStore, 'initializeAtlas')
      const atlasStore = useAtlasStore()

      atlasStore.selectedAtlasId = 'europe' as AtlasId
      await vi.waitFor(() => expect(initializeAtlas).toHaveBeenCalled())
      const result = await initializeAtlas.mock.results[0]!.value

      expect(result).toEqual(ok(undefined))
      expect(atlasStore.currentAtlasConfig?.id).toBe(atlasStore.selectedAtlasId)
    })
  })

  describe('atlas change', () => {
    it('opens the previous atlas again when the new atlas fails to open', async () => {
      await startApplication(FRANCE)
      useCompositionStore()
      const atlasStore = useAtlasStore()
      const loadAtlas = vi.spyOn(atlasStore, 'loadAtlas')
      stubFetchFailingOn('usa')

      atlasStore.selectedAtlasId = 'usa' as AtlasId
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))

      expect(atlasStore.selectedAtlasId).toBe('france')
      expect(atlasStore.currentAtlasConfig?.id).toBe('france')
      expect(loadAtlas.mock.calls.map(([atlasId]) => atlasId)).toEqual(['usa', 'france'])
    })

    it('shows a toast when the new atlas fails to open', async () => {
      await startApplication(FRANCE)
      useCompositionStore()
      stubFetchFailingOn('usa')

      useAtlasStore().selectedAtlasId = 'usa' as AtlasId
      await vi.waitFor(() => expect(useUIStore().toasts).toHaveLength(1))

      expect(useUIStore().toasts[0]).toMatchObject({
        type: 'error',
        error: {
          code: 'ATLAS_SWITCH_FAILED',
          atlasId: 'usa',
          cause: { code: 'JSON_FILE_NOT_FOUND', path: '/configs/atlases/usa.json' },
        },
      })
    })

    it('reads the configuration of the new atlas once', async () => {
      await startApplication(FRANCE)
      useCompositionStore()
      const loadJSON = vi.spyOn(JsonFileLoader, 'loadJSON')

      useAtlasStore().selectedAtlasId = 'portugal' as AtlasId
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))

      expect(useAtlasStore().currentAtlasConfig?.id).toBe('portugal')
      expect(loadJSON.mock.calls.filter(([path]) => path === 'configs/atlases/portugal.json')).toHaveLength(1)
    })
  })

  describe('loadPreset', () => {
    it('fails when the preset does not load', async () => {
      await startApplication(FRANCE)
      vi.spyOn(PresetLoader, 'loadPreset').mockResolvedValueOnce(err({ code: 'PRESET_UNKNOWN', presetId: 'nonexistent' }))

      const result = await useCompositionStore().loadPreset({ presetId: createPresetId('nonexistent') })

      expect(result).toEqual(err({ code: 'PRESET_UNKNOWN', presetId: 'nonexistent' }))
    })

    it('names every rule that the preset breaks', async () => {
      await startApplication(FRANCE)
      vi.spyOn(PresetLoader, 'loadPreset').mockResolvedValueOnce(err({
        code: 'PRESET_INVALID',
        presetId: 'france-unified',
        issues: [{ code: 'PRESET_PROJECTION_MISSING' }, { code: 'PRESET_ATLAS_ID_INVALID' }],
      }))

      const result = await useCompositionStore().loadPreset({ presetId: createPresetId('france-unified') })

      expect(result).toEqual(err({
        code: 'PRESET_INVALID',
        presetId: 'france-unified',
        issues: [{ code: 'PRESET_PROJECTION_MISSING' }, { code: 'PRESET_ATLAS_ID_INVALID' }],
      }))
    })

    it('skips the validation when requested', async () => {
      await startApplication(FRANCE)
      const validatePreset = vi.spyOn(PresetValidationService, 'validatePreset')

      const result = await useCompositionStore().loadPreset({
        presetId: createPresetId('france-standard'),
        skipValidation: true,
      })

      expect(result).toEqual(ok(undefined))
      expect(validatePreset).not.toHaveBeenCalled()
    })
  })

  describe('readConfigurationFile', () => {
    function frenchPresetFile(): File {
      const { json } = readPresetFiles().find(({ id }) => id === 'france-standard')!
      return new File([json], 'france-standard.json')
    }

    it('reads a file of the current atlas', async () => {
      await startApplication(FRANCE)

      const result = await useCompositionStore().readConfigurationFile(frenchPresetFile())

      expect(result.ok).toBe(true)
    })

    it('fails while the atlas configuration is not loaded', async () => {
      await startApplication(FRANCE)
      useAtlasStore().currentAtlasConfig = undefined

      const result = await useCompositionStore().readConfigurationFile(frenchPresetFile())

      expect(result).toEqual(err({ code: 'IMPORT_ATLAS_NOT_LOADED' }))
    })

    it('fails while another atlas is loading', async () => {
      await startApplication(FRANCE)
      const atlasStore = useAtlasStore()
      atlasStore.currentAtlasConfig = { ...atlasStore.currentAtlasConfig!, id: 'portugal' }

      const result = await useCompositionStore().readConfigurationFile(frenchPresetFile())

      expect(result).toEqual(err({ code: 'IMPORT_ATLAS_NOT_LOADED' }))
    })

    it('refuses a file of another atlas', async () => {
      await startApplication(FRANCE)
      const { json } = readPresetFiles().find(({ atlasId, type }) => atlasId === 'portugal' && type === 'composite-custom')!

      const result = await useCompositionStore().readConfigurationFile(new File([json], 'portugal.json'))

      expect(result).toEqual(err({ code: 'IMPORT_ATLAS_MISMATCH', importedAtlasId: 'portugal', currentAtlasId: 'france' }))
    })
  })

  describe('resetTransforms', () => {
    it('gives each territory the translation of the preset again', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      const parameterStore = useParameterStore()
      const presetTranslations = usePresetDefaultsStore().territoryDefaults!.translations
      const territoryCodes = Object.keys(presetTranslations) as TerritoryCode[]
      territoryCodes.forEach(code => parameterStore.setTerritoryTranslation(code, 'x', 999))

      compositionStore.resetTransforms()

      expect(Object.fromEntries(territoryCodes.map(code => [code, parameterStore.getTerritoryTranslation(code)])))
        .toEqual(presetTranslations)
    })
  })

  describe('startMapView', () => {
    it('writes the error of the geographic data in the geoData store', async () => {
      const geoDataStore = await startMapViewWithMissingFile('/data/')

      expect(geoDataStore.error).toEqual({ code: 'JSON_FILE_NOT_FOUND', path: '/data/france-territories-50m.json' })
      expect(geoDataStore.isReinitializing).toBe(false)
    })

    it('keeps the rules that an invalid default preset breaks', async () => {
      await startApplication(FRANCE)
      const failure: PresetError = {
        code: 'PRESET_INVALID',
        presetId: 'france-standard',
        issues: [{ code: 'PRESET_PROJECTION_MISSING' }],
      }
      vi.spyOn(PresetLoader, 'loadPreset').mockResolvedValueOnce(err(failure))

      await useCompositionStore().startMapView()

      expect(useGeoDataStore().error).toEqual(failure)
    })

    it('writes the failure of the default preset in the geoData store', async () => {
      const geoDataStore = await startMapViewWithMissingFile('/presets/')

      expect(geoDataStore.error).toEqual({ code: 'JSON_FILE_NOT_FOUND', path: expect.stringContaining('/presets/') })
    })
  })
})
