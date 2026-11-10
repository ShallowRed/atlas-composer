import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { AtlasConfigError, PresetError } from '@/core/types/errors'
import type { AtlasConfig } from '@/types/atlas'
import type { AtlasId, PresetId, ProjectionId, TerritoryCode } from '@/types/branded'
import type { ViewMode } from '@/types/composite'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openAtlasWithCartographer, startApplication } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'
import { extractTerritoryParameters } from '@/core/presets/converter'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { err, ok } from '@/core/types/result'
import { JsonFileLoader } from '@/services/data/json-file-loader'
import { PresetLoader } from '@/services/presets/preset-loader'
import { Cartographer } from '@/services/rendering/cartographer-service'
import { PresetValidationService } from '@/services/validation/preset-validation-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
import { createPresetId } from '@/types/branded'

const FRANCE = 'france' as AtlasId

type CompositionStore = ReturnType<typeof useCompositionStore>

const REFUSED_PRESET: PresetError = {
  code: 'PRESET_INVALID',
  presetId: 'france-unified',
  issues: [{ code: 'PRESET_TYPE_NOT_SUPPORTED', presetType: 'unified', atlasId: 'france' }],
}

async function readPresetConfig(file: string) {
  return JSON.parse(await readFile(`configs/presets/france/${file}.json`, 'utf8')) as CompositeProjectionConfig
}

function territoryCodes(): TerritoryCode[] {
  return useAtlasStore().atlasService.getAllTerritories().map(({ code }) => code as TerritoryCode)
}

function compositionLeft() {
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()
  return {
    territoryParameters: Object.fromEntries(territoryCodes().map(code => [code, parameterStore.getTerritoryParameters(code)])),
    activeTerritories: [...useViewStore().activeTerritoryCodes],
    canvas: { referenceScale: projectionStore.referenceScale, dimensions: projectionStore.canvasDimensions },
  }
}

async function initializeInView(viewMode: ViewMode) {
  useViewStore().viewMode = viewMode
  vi.spyOn(useViewStore(), 'autoLoadFirstPreset').mockResolvedValue()
  return useCompositionStore().initializeAtlas({ preserveViewMode: true })
}

function reinitializedTerritories() {
  const [atlasConfig] = vi.mocked(useGeoDataStore().reinitialize).mock.calls.at(-1) as [AtlasConfig]
  return atlasConfig.compositeProjectionConfig?.territories.map(({ code }) => code)
}

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

    it.each(['composite-custom', 'split', 'unified', 'built-in-composite'] as const)('fails when the default preset of the %s view is invalid', async (viewMode) => {
      await startApplication(FRANCE)
      vi.spyOn(PresetValidationService, 'validatePreset').mockReturnValueOnce(err(REFUSED_PRESET))

      const result = await initializeInView(viewMode)

      expect(result).toEqual(err(REFUSED_PRESET))
      expect(useGeoDataStore().isReinitializing).toBe(false)
      expect(useAppStore().state).toBe('error')
    })

    it('opens the selected atlas', async () => {
      await startApplication(FRANCE)
      const atlasStore = useAtlasStore()

      await useCompositionStore().selectAtlas('europe' as AtlasId)

      expect(atlasStore.selectedAtlasId).toBe('europe')
      expect(atlasStore.currentAtlasConfig?.id).toBe('europe')
    })

    it('loads the default view preset of the atlas', async () => {
      await startApplication(FRANCE)

      await useCompositionStore().selectAtlas('europe' as AtlasId)

      expect(useViewStore().currentViewPreset).toBe('europe-builtin')
    })

    it('opens nothing when the atlas is already selected', async () => {
      await startApplication(FRANCE)
      const loadAtlas = vi.spyOn(useAtlasStore(), 'loadAtlas')

      await useCompositionStore().selectAtlas(FRANCE)

      expect(loadAtlas).not.toHaveBeenCalled()
    })

    it('opens nothing when the view is already selected', async () => {
      await startApplication(FRANCE)
      const loadAtlas = vi.spyOn(useAtlasStore(), 'loadAtlas')

      await useCompositionStore().selectViewMode(useViewStore().viewMode)

      expect(loadAtlas).not.toHaveBeenCalled()
    })

    it('clears the global parameters when the view changes', async () => {
      await startApplication(FRANCE)
      useParameterStore().setGlobalParameters({ rotate: [10, 20, 0] })
      useParameterStore().setGlobalParameter('parallels', [20, 50])

      await useCompositionStore().selectViewMode('unified')

      expect(useParameterStore().globalParameters.rotate).toBeUndefined()
      expect(useParameterStore().globalParameters.parallels).toBeUndefined()
    })
  })

  describe('state left by an initialization', () => {
    it('leaves the parameters, the territories and the canvas of the default preset in the composite-custom view', async () => {
      await startApplication(FRANCE)
      const config = await readPresetConfig('france-pseudo-d3cp')
      const presetCodes = config.territories.map(({ code }) => code)

      await initializeInView('composite-custom')

      expect(compositionLeft()).toEqual({
        territoryParameters: {
          ...Object.fromEntries(territoryCodes().map(code => [code, {}])),
          ...extractTerritoryParameters(config),
        },
        activeTerritories: presetCodes,
        canvas: { referenceScale: config.referenceScale, dimensions: config.canvasDimensions },
      })
      expect(reinitializedTerritories()?.sort()).toEqual(presetCodes.sort())
    })

    it.each(['split', 'unified', 'built-in-composite'] as const)('leaves each territory at its default position, without active territory nor canvas, in the %s view', async (viewMode) => {
      await startApplication(FRANCE)

      await initializeInView(viewMode)

      expect(compositionLeft()).toEqual({
        territoryParameters: Object.fromEntries(territoryCodes().map(code => [code, {
          projectionId: FALLBACK_PROJECTION_ID,
          translateOffset: [0, 0],
          scaleMultiplier: 1,
        }])),
        activeTerritories: [],
        canvas: { referenceScale: undefined, dimensions: undefined },
      })
      expect(reinitializedTerritories()).toEqual([])
    })
  })

  describe('loading states', () => {
    it('keeps the reinitialization flag until the data is preloaded', async () => {
      await startApplication(FRANCE)
      const geoDataStore = useGeoDataStore()
      vi.mocked(geoDataStore.reinitialize).mockRestore()
      vi.spyOn(Cartographer.prototype, 'init').mockResolvedValue(ok(undefined))
      let flagDuringPresets: boolean | undefined
      vi.spyOn(useViewStore(), 'autoLoadFirstPreset').mockImplementation(async () => {
        flagDuringPresets = geoDataStore.isReinitializing
      })
      let flagDuringPreload: boolean | undefined
      vi.mocked(geoDataStore.loadAllAtlasData).mockImplementation(async () => {
        flagDuringPreload = geoDataStore.isReinitializing
        return ok(undefined)
      })

      await useCompositionStore().initializeAtlas()

      expect(flagDuringPresets).toBe(true)
      expect(flagDuringPreload).toBe(true)
      expect(geoDataStore.isReinitializing).toBe(false)
    })

    it('leaves the flag of the latest initialization to it when a superseded one ends', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      const geoDataStore = useGeoDataStore()
      const releases: Array<() => void> = []
      vi.mocked(geoDataStore.loadAllAtlasData).mockImplementation(() => new Promise((resolve) => {
        releases.push(() => resolve(ok(undefined)))
      }))

      const superseded = compositionStore.initializeAtlas()
      await vi.waitFor(() => expect(releases).toHaveLength(1))
      const latest = compositionStore.initializeAtlas()
      await vi.waitFor(() => expect(releases).toHaveLength(2))
      releases[0]!()
      await superseded

      expect(geoDataStore.isReinitializing).toBe(true)

      releases[1]!()
      await latest

      expect(geoDataStore.isReinitializing).toBe(false)
    })
  })

  describe('default projections', () => {
    it('gives the custom composite view its projection, and the atlas its composite projection', async () => {
      await startApplication(FRANCE)

      await useCompositionStore().initializeAtlas()

      expect(useProjectionStore().selectedProjection).toBe('conic-conformal')
      expect(useProjectionStore().compositeProjection).toBe('conic-conformal-france')
    })

    it.each(['split', 'unified', 'built-in-composite'] as const)('selects natural-earth in the %s view', async (viewMode) => {
      await startApplication(FRANCE)
      useViewStore().viewMode = viewMode

      await useCompositionStore().initializeAtlas({ preserveViewMode: true })

      expect(useProjectionStore().selectedProjection).toBe('natural-earth')
    })

    it('clears the composite projection for an atlas without one', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()

      await compositionStore.selectAtlas('world' as AtlasId)

      expect(useProjectionStore().compositeProjection).toBeNull()
    })
  })

  describe('atlas change', () => {
    it('opens the previous atlas again when the new atlas fails to open', async () => {
      await startApplication(FRANCE)
      const atlasStore = useAtlasStore()
      const loadAtlas = vi.spyOn(atlasStore, 'loadAtlas')
      stubFetchFailingOn('usa')

      await useCompositionStore().selectAtlas('usa' as AtlasId)

      expect(atlasStore.selectedAtlasId).toBe('france')
      expect(atlasStore.currentAtlasConfig?.id).toBe('france')
      expect(loadAtlas.mock.calls.map(([atlasId]) => atlasId)).toEqual(['usa', 'france'])
    })

    it('shows a toast when the new atlas fails to open', async () => {
      await startApplication(FRANCE)
      stubFetchFailingOn('usa')

      await useCompositionStore().selectAtlas('usa' as AtlasId)

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
      const loadJSON = vi.spyOn(JsonFileLoader, 'loadJSON')

      await useCompositionStore().selectAtlas('portugal' as AtlasId)

      expect(useAtlasStore().currentAtlasConfig?.id).toBe('portugal')
      expect(loadJSON.mock.calls.filter(([path]) => path === 'configs/atlases/portugal.json')).toHaveLength(1)
    })
  })

  describe('close selections of atlases', () => {
    function delayAtlas(delays: Record<string, number>, failure?: AtlasConfigError) {
      const atlasStore = useAtlasStore()
      const loadAtlas = atlasStore.loadAtlas
      return vi.spyOn(atlasStore, 'loadAtlas').mockImplementation(async (atlasId) => {
        await new Promise(resolve => setTimeout(resolve, delays[atlasId] ?? 0))
        return failure && atlasId === Object.keys(delays)[0] ? err(failure) : loadAtlas(atlasId)
      })
    }

    it.each([[40, 5], [5, 40]])('opens the last atlas once for each selection, with responses of %i and %i ms', async (first, second) => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      const atlasStore = useAtlasStore()
      const loadAtlas = delayAtlas({ usa: first, europe: second })

      await Promise.all([
        compositionStore.selectAtlas('usa' as AtlasId),
        compositionStore.selectAtlas('europe' as AtlasId),
      ])
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))

      expect(loadAtlas.mock.calls.map(([atlasId]) => atlasId)).toEqual(['usa', 'europe'])
      expect(atlasStore.selectedAtlasId).toBe('europe')
      expect(atlasStore.currentAtlasConfig?.id).toBe('europe')
    })

    it('stops before writing the state of the superseded atlas', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      delayAtlas({ usa: 20 })
      const loadPreset = vi.spyOn(PresetLoader, 'loadPreset')

      await Promise.all([
        compositionStore.selectAtlas('usa' as AtlasId),
        compositionStore.selectAtlas('europe' as AtlasId),
      ])

      expect(loadPreset.mock.calls.map(([presetId]) => presetId).filter(presetId => presetId.startsWith('usa'))).toEqual([])
    })

    it('ignores the failure of a superseded initialization', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      delayAtlas({ usa: 20 }, { code: 'JSON_FILE_NOT_FOUND', path: 'usa' })

      await Promise.all([
        compositionStore.selectAtlas('usa' as AtlasId),
        compositionStore.selectAtlas('europe' as AtlasId),
      ])
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))

      expect(useUIStore().toasts).toEqual([])
      expect(useGeoDataStore().error).toBeNull()
      expect(useAtlasStore().selectedAtlasId).toBe('europe')
    })
  })

  describe('superseded initialization', () => {
    const FAILURE = err({ code: 'JSON_FILE_NOT_FOUND', path: 'superseded' } as const)

    // Holds the first call of a step of the initialization, and answers with its outcome on release
    function holdOnce<T extends object, K extends keyof T>(target: T, method: K, outcome: () => unknown) {
      let release!: () => void
      const released = new Promise<void>((resolve) => {
        release = resolve
      })
      const spy = (vi.isMockFunction(target[method]) ? target[method] : vi.spyOn(target, method as any)) as any
      spy.mockImplementationOnce(async () => {
        await released
        return outcome()
      })
      return { release, spy }
    }

    const throwNetworkError = () => {
      throw new Error('network')
    }

    const STEPS = [
      ['preset of the composite-custom view', 'composite-custom', () => holdOnce(PresetLoader, 'loadPreset', () => FAILURE)],
      ['preset of another view', 'split', () => holdOnce(PresetLoader, 'loadPreset', () => FAILURE)],
      ['view preset', 'composite-custom', () => holdOnce(useViewStore(), 'autoLoadFirstPreset', () => undefined)],
      ['failed creation of the cartographer', 'composite-custom', () => holdOnce(useGeoDataStore(), 'reinitialize', () => FAILURE)],
      ['failed preload', 'composite-custom', () => holdOnce(useGeoDataStore(), 'loadAllAtlasData', () => FAILURE)],
      ['exception', 'composite-custom', () => holdOnce(useGeoDataStore(), 'reinitialize', throwNetworkError)],
    ] as const

    it.each(STEPS)('stops at the %s', async (_, view, hold) => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      await compositionStore.selectViewMode(view)
      const { release, spy } = hold()
      const geoDataStore = useGeoDataStore()
      vi.mocked(geoDataStore.reinitialize).mockClear()
      const firstCalls = spy.mock.calls.length

      const superseded = compositionStore.selectAtlas('portugal' as AtlasId)
      await vi.waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(firstCalls))
      await compositionStore.selectAtlas('usa' as AtlasId)
      const reinitializeCalls = vi.mocked(geoDataStore.reinitialize).mock.calls.length
      release()
      await superseded
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))

      expect(useUIStore().toasts).toEqual([])
      expect(geoDataStore.error).toBeNull()
      expect(useAtlasStore().selectedAtlasId).toBe('usa')
      expect(vi.mocked(geoDataStore.reinitialize).mock.calls).toHaveLength(reinitializeCalls)
    })
  })

  describe('replacement of the composite preset', () => {
    const PROPORTIONAL = createPresetId('france-proportional')
    const STANDARD = createPresetId('france-standard')

    function exportedTerritories(geoDataStore: ReturnType<typeof useGeoDataStore>) {
      const exported = geoDataStore.exportConfiguration()
      if (!exported.ok) {
        throw new Error(JSON.stringify(exported.error))
      }
      return exported.value.territories
    }

    async function exportAfterPresets(...presetIds: PresetId[]) {
      const geoDataStore = await openAtlasWithCartographer(FRANCE)
      for (const presetId of presetIds) {
        expect(await useCompositionStore().loadPreset({ presetId })).toEqual(ok(undefined))
      }
      return exportedTerritories(geoDataStore)
    }

    it('exports a preset loaded after another as if it were loaded alone', async () => {
      const alone = await exportAfterPresets(STANDARD)

      expect(await exportAfterPresets(PROPORTIONAL, STANDARD)).toEqual(alone)
    })

    it('exports each territory of an imported file that has more territories than the preset', async () => {
      const geoDataStore = await openAtlasWithCartographer(FRANCE)
      const config = await readPresetConfig('france-proportional')

      expect(await useCompositionStore().importConfiguration(config)).toEqual(ok(undefined))

      expect(exportedTerritories(geoDataStore).map(territory => territory.code).sort())
        .toEqual(config.territories.map(territory => territory.code).sort())
    })

    it('keeps no territory of the previous preset after an import', async () => {
      const geoDataStore = await openAtlasWithCartographer(FRANCE)
      const config = await readPresetConfig('france-standard')

      await useCompositionStore().importConfiguration(config)

      expect(exportedTerritories(geoDataStore)).toHaveLength(config.territories.length)
    })
  })

  describe('import and preset of the same file', () => {
    async function leftBy(apply: (compositionStore: CompositionStore) => Promise<unknown>) {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      expect(await apply(useCompositionStore())).toEqual(ok(undefined))
      return { composition: compositionLeft(), presetValues: { ...usePresetDefaultsStore().presetParameters } }
    }

    async function leftByImportAndByPreset() {
      const config = await readPresetConfig('france-proportional')
      return {
        config,
        imported: await leftBy(compositionStore => compositionStore.importConfiguration(config)),
        preset: await leftBy(compositionStore => compositionStore.loadPreset({ presetId: createPresetId('france-proportional') })),
      }
    }

    it('leaves the same territory parameters, active territories and canvas', async () => {
      const { config, imported, preset } = await leftByImportAndByPreset()

      expect(imported.composition).toEqual(preset.composition)
      expect(imported.composition.activeTerritories).toEqual(config.territories.map(({ code }) => code))
    })

    it('leaves the same preset values', async () => {
      const { imported, preset } = await leftByImportAndByPreset()

      expect(imported.presetValues).toEqual(preset.presetValues)
    })

    it('leaves out a key of the imported file that the parameter registry does not hold', async () => {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      const config = await readPresetConfig('france-standard')
      const [territory] = config.territories
      Object.assign(territory!.projection.parameters, { tilt: 30 })

      expect(await useCompositionStore().importConfiguration(config)).toEqual(ok(undefined))

      expect(useParameterStore().getTerritoryParameters(territory!.code as TerritoryCode)).not.toHaveProperty('tilt')
    })
  })

  describe('display options', () => {
    it.each<[string, (compositionStore: CompositionStore) => Promise<void>]>([
      ['a composite preset', async (compositionStore) => {
        expect(await compositionStore.loadPreset({ presetId: createPresetId('france-standard') })).toEqual(ok(undefined))
      }],
      ['an import', async (compositionStore) => {
        expect(await compositionStore.importConfiguration(await readPresetConfig('france-standard'))).toEqual(ok(undefined))
      }],
      ['an atlas change', async (compositionStore) => {
        await compositionStore.selectAtlas('portugal' as AtlasId)
        expect(useAtlasStore().currentAtlasConfig?.id).toBe('portugal')
      }],
    ])('keeps the options chosen by the user after %s', async (_action, act) => {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      const uiStore = useUIStore()
      uiStore.showGraticule = true
      uiStore.showCompositionBorders = false
      uiStore.showMapLimits = false

      await act(useCompositionStore())

      expect([uiStore.showGraticule, uiStore.showCompositionBorders, uiStore.showMapLimits]).toEqual([true, false, false])
    })
  })

  describe('defaults of the split preset', () => {
    const METROPOLE = 'FR-MET' as TerritoryCode
    const OUTSIDE_PRESET = 'FR-NC' as TerritoryCode
    const WITHOUT_PROJECTION = 'FR-TF' as TerritoryCode

    function changeTerritory(code: TerritoryCode) {
      const parameterStore = useParameterStore()
      parameterStore.setTerritoryProjection(code, 'mercator' as ProjectionId)
      parameterStore.setTerritoryParameters(code, { rotate: [10, 10, 0] })
    }

    function changeThenReset(code: TerritoryCode) {
      changeTerritory(code)
      useCompositionStore().resetTerritoryToDefaults(code)
      return useParameterStore().getEffectiveParameters(code)
    }

    const PRESET_VALUES = { projectionId: 'conic-conformal', rotate: [-3, -46.2, 0], parallels: [0, 60] }

    it('resets a territory to the split preset after a change of view', async () => {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      await useCompositionStore().selectViewMode('split')

      expect(changeThenReset(METROPOLE)).toMatchObject(PRESET_VALUES)
    })

    it('resets a territory to the split preset after an initialization in this view', async () => {
      await startApplication(FRANCE)
      useViewStore().viewMode = 'split'
      await useCompositionStore().initializeAtlas({ preserveViewMode: true })

      expect(changeThenReset(METROPOLE)).toMatchObject(PRESET_VALUES)
    })

    it('shows no difference with the preset after the load and after a reset', async () => {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      await useCompositionStore().selectViewMode('split')
      const parameterStore = useParameterStore()
      const presetDefaults = usePresetDefaultsStore()

      for (const code of [METROPOLE, 'FR-GP', OUTSIDE_PRESET, WITHOUT_PROJECTION] as TerritoryCode[]) {
        expect(parameterStore.getTerritoryParameters(code)).toEqual(presetDefaults.presetParameters[code])

        changeThenReset(code)

        expect(parameterStore.getTerritoryParameters(code)).toEqual(presetDefaults.presetParameters[code])
      }
    })

    it.each([OUTSIDE_PRESET, WITHOUT_PROJECTION])('restores %s with the reset of all territories', async (code) => {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      await useCompositionStore().selectViewMode('split')
      const parameterStore = useParameterStore()
      const expected = { ...parameterStore.getTerritoryParameters(code) }
      expect(expected.projectionId).toBeDefined()

      changeTerritory(code)
      useCompositionStore().resetTransforms()

      expect(parameterStore.getTerritoryParameters(code)).toEqual(expected)
    })

    it('drops the parameters of the previous preset that the split preset does not set', async () => {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      expect(useParameterStore().getTerritoryParameters(METROPOLE).pixelClipExtent).toBeDefined()

      await useCompositionStore().selectViewMode('split')

      expect(useParameterStore().getTerritoryParameters(METROPOLE).pixelClipExtent).toBeUndefined()
    })

    it('forgets the defaults of the composite preset when the split view has no preset yet', async () => {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      vi.spyOn(useViewStore(), 'autoLoadFirstPreset').mockResolvedValue()

      await useCompositionStore().selectViewMode('split')

      expect(usePresetDefaultsStore().presetParameters).toEqual({})
    })

    it('stores no default before the split preset loads', async () => {
      await startApplication(FRANCE)
      useViewStore().viewMode = 'split'
      vi.spyOn(useViewStore(), 'autoLoadFirstPreset').mockResolvedValue()

      await useCompositionStore().initializeAtlas({ preserveViewMode: true })

      expect(usePresetDefaultsStore().presetParameters).toEqual({})
    })
  })

  describe('preset of a previous selection', () => {
    function holdPreset() {
      let release!: () => void
      const held = new Promise<void>((resolve) => {
        release = resolve
      })
      const load = PresetLoader.loadPreset
      vi.spyOn(PresetLoader, 'loadPreset').mockImplementationOnce(async (presetId) => {
        await held
        return load(presetId)
      })
      return release
    }

    const PRESET = createPresetId('france-proportional')

    it('drops a preset that arrives after a change of atlas', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      const release = holdPreset()

      const loading = compositionStore.loadPreset({ presetId: PRESET })
      await compositionStore.selectAtlas('portugal' as AtlasId)
      const territories = [...useViewStore().activeTerritoryCodes]
      release()

      expect(await loading).toEqual(ok(undefined))
      expect([...useViewStore().activeTerritoryCodes]).toEqual(territories)
    })

    it('drops a preset that arrives after a change of view', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      const release = holdPreset()

      const loading = compositionStore.loadPreset({ presetId: PRESET })
      await compositionStore.selectViewMode('unified')
      release()

      expect(await loading).toEqual(ok(undefined))
      expect(useViewStore().viewMode).toBe('unified')
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))
    })

    it('keeps the application ready when a load of the previous atlas fails', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      vi.mocked(useGeoDataStore().loadAllAtlasData).mockImplementationOnce(async () => {
        await compositionStore.selectAtlas('europe' as AtlasId)
        throw new Error('network')
      })

      const result = await compositionStore.loadPreset({ presetId: PRESET })

      expect(result).toEqual(ok(undefined))
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))
    })

    it('keeps the application ready when the data of the previous atlas answers with a failure', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      vi.mocked(useGeoDataStore().loadAllAtlasData).mockImplementationOnce(async () => {
        await compositionStore.selectAtlas('europe' as AtlasId)
        return err({ code: 'JSON_FILE_NOT_FOUND', path: 'previous' })
      })

      const result = await compositionStore.loadPreset({ presetId: PRESET })

      expect(result).toEqual(ok(undefined))
      await vi.waitFor(() => expect(useAppStore().state).toBe('ready'))
    })

    it('ignores the failed data of an import when the atlas changed', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      vi.mocked(useGeoDataStore().loadAllAtlasData).mockImplementationOnce(async () => {
        await compositionStore.selectAtlas('europe' as AtlasId)
        return err({ code: 'JSON_FILE_NOT_FOUND', path: 'previous' })
      })

      const result = await compositionStore.importConfiguration(
        JSON.parse(await readFile('configs/presets/france/france-proportional.json', 'utf8')) as CompositeProjectionConfig,
      )

      expect(result).toEqual(ok(undefined))
    })

    it('ignores the failure of an import when the atlas changed', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      vi.mocked(useGeoDataStore().loadAllAtlasData).mockImplementationOnce(async () => {
        await compositionStore.selectAtlas('europe' as AtlasId)
        throw new Error('network')
      })

      const result = await compositionStore.importConfiguration({
        ...(JSON.parse(await readFile('configs/presets/france/france-proportional.json', 'utf8')) as object),
      } as CompositeProjectionConfig)

      expect(result).toEqual(ok(undefined))
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
    it('gives each territory the parameters of the preset again', async () => {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      const parameterStore = useParameterStore()
      const presetParameters = { ...usePresetDefaultsStore().presetParameters }
      const presetCodes = Object.keys(presetParameters) as TerritoryCode[]
      presetCodes.forEach(code => parameterStore.setTerritoryTranslation(code, 'x', 999))

      compositionStore.resetTransforms()

      expect(Object.fromEntries(presetCodes.map(code => [code, parameterStore.getTerritoryParameters(code)])))
        .toEqual(presetParameters)
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
