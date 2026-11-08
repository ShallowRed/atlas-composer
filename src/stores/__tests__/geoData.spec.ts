import type { AtlasId } from '@/types/branded'
import { validateConfig } from '@atlas-composer/specification'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
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
    withComposite ? atlasConfig.compositeProjectionConfig : undefined,
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

  describe('exportConfiguration', () => {
    it('exports a valid configuration of the open atlas', async () => {
      const { atlasConfig, geoDataStore } = await openFranceWithCartographer({ withComposite: true })

      const result = geoDataStore.exportConfiguration()
      if (!result.ok) {
        throw new Error(result.error.code)
      }
      const exported = result.value

      expect(validateConfig(JSON.parse(JSON.stringify(exported)))).toMatchObject({ valid: true, errors: [] })
      expect(exported.metadata).toMatchObject({ atlasId: atlasConfig.id, atlasName: atlasConfig.name })
      expect(exported.territories.map(territory => territory.code))
        .toEqual(geoDataStore.cartographer!.customComposite!.exportConfig().subProjections.map(sub => sub.territoryCode))
    })

    it('fails without a composite projection', async () => {
      const { geoDataStore } = await openFranceWithCartographer({ withComposite: false })

      expect(geoDataStore.exportConfiguration()).toEqual({ ok: false, error: { code: 'EXPORT_NOT_AVAILABLE' } })
    })
  })
})
