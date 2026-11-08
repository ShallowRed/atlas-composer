import type { AtlasId } from '@/types/branded'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openView, startApplication } from '@/__tests__/composite-utils'
import { JsonFileLoader } from '@/services/data/json-file-loader'
import { PresetLoader } from '@/services/presets/preset-loader'
import { PresetValidationService } from '@/services/validation/preset-validation-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'

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
      vi.spyOn(PresetLoader, 'loadPreset').mockResolvedValueOnce({
        success: false,
        data: undefined,
        errors: ['Preset not found'],
        warnings: [],
      })

      const result = await useCompositionStore().initializeAtlas()

      expect(result.success).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining('Failed to load default preset'))
      expect(useGeoDataStore().isReinitializing).toBe(false)
      expect(useAppStore().state).toBe('error')
    })

    it('fails when the default preset is invalid', async () => {
      await startApplication(FRANCE)
      await openView(FRANCE, 'split')
      vi.spyOn(PresetValidationService, 'validatePreset').mockReturnValueOnce({
        isValid: false,
        errors: ['Invalid preset structure'],
        warnings: [],
      })

      const result = await useCompositionStore().initializeAtlas({ preserveViewMode: true })

      expect(result.success).toBe(false)
      expect(result.errors).toContainEqual('Invalid preset structure')
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

      expect(result.success).toBe(true)
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

    it('reads the configuration of the new atlas once', async () => {
      await startApplication(FRANCE)
      useCompositionStore()
      const loadJSON = vi.spyOn(JsonFileLoader, 'loadJSON')

      useAtlasStore().selectedAtlasId = 'portugal' as AtlasId
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))

      expect(loadJSON.mock.calls.filter(([path]) => path === 'configs/atlases/portugal.json')).toHaveLength(1)
    })
  })

  describe('startMapView', () => {
    it('writes the error of the geographic data in the geoData store', async () => {
      const geoDataStore = await startMapViewWithMissingFile('/data/')

      expect(geoDataStore.error).toEqual({ code: 'GEODATA_NOT_FOUND', path: '/data/france-territories-50m.json' })
      expect(geoDataStore.isReinitializing).toBe(false)
    })

    it('writes the failure of the default preset in the geoData store', async () => {
      const geoDataStore = await startMapViewWithMissingFile('/presets/')

      expect(geoDataStore.error).toEqual({
        code: 'INITIALIZATION_FAILED',
        reason: expect.stringContaining('Failed to load default preset'),
      })
    })
  })
})
