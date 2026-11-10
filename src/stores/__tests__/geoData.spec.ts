import type { AtlasId } from '@/types/branded'
import { validateConfig } from '@atlas-composer/specification'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { err, ok } from '@/core/types/result'
import { TerritoryDataLoader } from '@/services/data/territory-data-loader'
import { Cartographer } from '@/services/rendering/cartographer-service'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'

const FRANCE = 'france' as AtlasId

// The cartographer is built without init(), which loads the geographic data
async function openFranceWithCartographer({ withComposite }: { withComposite: boolean }) {
  await startApplication(FRANCE)
  await useCompositionStore().initializeAtlas()
  const atlasConfig = useAtlasStore().currentAtlasConfig!
  const geoDataStore = useGeoDataStore()
  geoDataStore.cartographer = new Cartographer(
    atlasConfig.geoDataConfig,
    withComposite ? atlasConfig.compositeTerritories : undefined,
    undefined,
    useParameterStore().parameterProvider,
    useProjectionStore().referenceScale,
  )
  return { atlasConfig, geoDataStore }
}

describe('geoData store', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('superseded loads', () => {
    async function holdCartographerInit() {
      await startApplication(FRANCE)
      await useCompositionStore().initializeAtlas()
      const geoDataStore = useGeoDataStore()
      vi.mocked(geoDataStore.reinitialize).mockRestore()
      vi.mocked(geoDataStore.loadAllAtlasData).mockRestore()
      const releases: Array<() => void> = []
      const init = vi.spyOn(Cartographer.prototype, 'init').mockImplementation(() => new Promise((resolve) => {
        releases.push(() => resolve(ok(undefined)))
      }))
      return { geoDataStore, init, releases, atlasConfig: useAtlasStore().currentAtlasConfig! }
    }

    function stubDataLoader() {
      const releases: Array<() => void> = []
      const held = <T>(value: T) => new Promise<T>((resolve) => {
        releases.push(() => resolve(value))
      })
      vi.spyOn(TerritoryDataLoader, 'create').mockReturnValue({
        loadTerritories: () => held({ territories: [{ code: 'FR-MET' }] }),
        loadUnifiedData: () => held({ data: { type: 'FeatureCollection', features: [] } }),
      } as unknown as TerritoryDataLoader)
      return releases
    }

    it('keeps the cartographer of the latest initialization when an earlier one answers last', async () => {
      const { geoDataStore, releases, atlasConfig } = await holdCartographerInit()

      const first = geoDataStore.reinitialize(atlasConfig)
      const second = geoDataStore.reinitialize(atlasConfig)
      releases[1]!()
      await second
      const latest = geoDataStore.cartographer
      releases[0]!()
      await first

      expect(latest).not.toBeNull()
      expect(geoDataStore.cartographer).toBe(latest)
    })

    it('ignores the failure of an earlier initialization', async () => {
      const { geoDataStore, init, atlasConfig } = await holdCartographerInit()
      init.mockImplementationOnce(async () => {
        await geoDataStore.reinitialize(atlasConfig)
        return err({ code: 'JSON_FILE_NOT_FOUND', path: 'first' })
      })
      init.mockResolvedValue(ok(undefined))

      await geoDataStore.reinitialize(atlasConfig)

      expect(geoDataStore.error).toBeNull()
    })

    it('builds one cartographer when a load starts during an initialization', async () => {
      const { geoDataStore, init, releases, atlasConfig } = await holdCartographerInit()
      const dataReleases = stubDataLoader()

      const initialization = geoDataStore.reinitialize(atlasConfig)
      const load = geoDataStore.loadAllAtlasData('all-territories')
      releases[0]!()
      await initialization
      await vi.waitFor(() => expect(dataReleases).toHaveLength(2))
      dataReleases.forEach(release => release())
      await load

      expect(init).toHaveBeenCalledTimes(1)
      expect(geoDataStore.territoriesData).toEqual([{ code: 'FR-MET' }])
    })

    it('waits for the latest initialization when a later one replaces the awaited one', async () => {
      const { geoDataStore, init, releases, atlasConfig } = await holdCartographerInit()
      const dataReleases = stubDataLoader()

      void geoDataStore.reinitialize(atlasConfig)
      const load = geoDataStore.loadAllAtlasData('all-territories')
      const latest = geoDataStore.reinitialize(atlasConfig)
      releases[0]!()
      await new Promise(resolve => setTimeout(resolve))
      releases[1]!()
      await latest
      await vi.waitFor(() => expect(dataReleases).toHaveLength(2))
      dataReleases.forEach(release => release())
      await load

      expect(init).toHaveBeenCalledTimes(2)
      expect(geoDataStore.territoriesData).toEqual([{ code: 'FR-MET' }])
    })

    it('reloads nothing without a cartographer', async () => {
      await startApplication(FRANCE)

      await expect(useGeoDataStore().reloadUnifiedData('all-territories')).resolves.toBeUndefined()
      expect(useGeoDataStore().rawUnifiedData).toBeNull()
    })

    it('drops the reloaded data of a cartographer that another one replaced', async () => {
      const { geoDataStore, atlasConfig } = await holdCartographerInit()
      vi.mocked(Cartographer.prototype.init).mockResolvedValue(ok(undefined))
      await geoDataStore.reinitialize(atlasConfig)
      const dataReleases = stubDataLoader()

      const reload = geoDataStore.reloadUnifiedData('all-territories')
      await geoDataStore.reinitialize(atlasConfig)
      await vi.waitFor(() => expect(dataReleases).toHaveLength(1))
      dataReleases[0]!()
      await reload

      expect(geoDataStore.rawUnifiedData).toBeNull()
    })

    it('drops the data of a cartographer that another one replaced', async () => {
      const { geoDataStore, atlasConfig } = await holdCartographerInit()
      vi.mocked(Cartographer.prototype.init).mockResolvedValue(ok(undefined))
      await geoDataStore.reinitialize(atlasConfig)
      const dataReleases = stubDataLoader()

      const load = geoDataStore.loadAllAtlasData('all-territories')
      await geoDataStore.reinitialize(atlasConfig)
      await vi.waitFor(() => expect(dataReleases).toHaveLength(2))
      dataReleases.forEach(release => release())
      await load

      expect(geoDataStore.territoriesData).toEqual([])
      expect(geoDataStore.rawUnifiedData).toBeNull()
    })
  })

  describe('exportConfiguration', () => {
    it('exports a valid configuration of the open atlas', async () => {
      const { atlasConfig, geoDataStore } = await openFranceWithCartographer({ withComposite: true })

      const result = geoDataStore.exportConfiguration()
      if (!result.ok) {
        throw new Error(result.error.code)
      }
      const exported = result.value

      expect(validateConfig(JSON.parse(JSON.stringify(exported)))).toMatchObject({ valid: true, errors: [] })
      expect(exported.metadata).toMatchObject({ atlasId: atlasConfig.id, atlasName: resolveI18nValue(atlasConfig.name, 'en') })
      expect(exported.territories.map(territory => territory.code))
        .toEqual(geoDataStore.cartographer!.customComposite!.exportConfig().subProjections.map(sub => sub.territoryCode))
    })

    it('fails without a composite projection', async () => {
      const { geoDataStore } = await openFranceWithCartographer({ withComposite: false })

      expect(geoDataStore.exportConfiguration()).toEqual({ ok: false, error: { code: 'EXPORT_NOT_AVAILABLE' } })
    })
  })
})
