import type { AtlasId, ProjectionId, TerritoryCode } from '@/types/branded'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { useProjectionPanning } from '@/composables/useProjectionPanning'
import { parseSharedLink } from '@/core/view'
import { JsonFileLoader } from '@/services/data/json-file-loader'
import { ProjectionService } from '@/services/projection/projection-service'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'
import { useUrlState } from '../useUrlState'

const route = vi.hoisted(() => ({ query: {} as Record<string, string> }))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace: vi.fn() }),
}))

const ATLAS_ID = 'world' as AtlasId

// Path of MapView.vue
async function openPage(query: Record<string, string>) {
  route.query = { atlas: ATLAS_ID, view: 'unified', ...query }
  await startApplication(ATLAS_ID)
  const urlState = useUrlState()
  await useCompositionStore().startMapView(urlState.readSharedLink())
  return urlState
}

function globalProjectionRotate(): number[] {
  const projectionStore = useProjectionStore()
  const service = new ProjectionService()
  service.setProjectionParams(useParameterStore().globalEffectiveParameters)
  const projection = service.getD3Projection(projectionStore.selectedProjection!, { type: 'Sphere' }, 800, 600, true)
  return projection!.rotate()
}

describe('useUrlState', () => {
  beforeEach(() => {
    route.query = {}
    vi.restoreAllMocks()
  })

  it('turns the global projection by rlon, rlat and rgam after the initialization', async () => {
    await openPage({ rlon: '-40', rlat: '-25', rgam: '10', p1: '20', p2: '50' })

    const [longitude, latitude, gamma] = globalProjectionRotate()
    expect(longitude).toBeCloseTo(-40, 9)
    expect(latitude).toBeCloseTo(-25, 9)
    expect(gamma).toBeCloseTo(10, 9)
    expect(useParameterStore().globalParameters.parallels).toEqual([20, 50])
  })

  it('ignores a view mode that does not exist', async () => {
    route.query = { atlas: ATLAS_ID, view: 'nowhere' }
    await startApplication(ATLAS_ID)

    expect(useUrlState().readSharedLink().view).toBeUndefined()
  })

  it('writes the rotation of the mouse panning in the URL', async () => {
    const urlState = await openPage({})
    const projectionStore = useProjectionStore()
    projectionStore.rotateLatitudeLocked = false

    const { handleMouseDown } = useProjectionPanning()
    handleMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    const [longitude, latitude, gamma] = globalProjectionRotate()
    expect(urlState.serializeState()).toMatchObject({
      rlon: String(longitude),
      rlat: String(latitude),
      rgam: String(gamma),
    })
    expect(longitude).not.toBe(0)
  })

  it('reads neither clon nor clat', async () => {
    const urlState = await openPage({ clon: '20', clat: '30' })

    expect(useParameterStore().globalParameters.center).toBeUndefined()
    expect(urlState.serializeState()).not.toHaveProperty('clon')
  })

  describe('shared link of the France atlas', () => {
    const FRANCE = 'france' as AtlasId
    const VIEWS = ['composite-custom', 'split', 'unified', 'built-in-composite'] as const
    const GUADELOUPE = 'FR-GP' as TerritoryCode

    function delayFiles(milliseconds: number) {
      const loadJSON = JsonFileLoader.loadJSON
      vi.spyOn(JsonFileLoader, 'loadJSON').mockImplementation(async (path: string) => {
        await new Promise(resolve => setTimeout(resolve, milliseconds))
        return loadJSON.call(JsonFileLoader, path)
      })
    }

    function snapshot() {
      const parameterStore = useParameterStore()
      const territories = useGeoDataStore().allActiveTerritories.map(({ code }) => [
        code,
        parameterStore.getTerritoryParameters(code).scaleMultiplier ?? 1,
        parameterStore.getTerritoryTranslation(code),
      ])
      return {
        view: useViewStore().viewMode,
        // The built-in-composite view draws the composite projection
        projection: useViewStore().viewMode === 'built-in-composite' ? null : useProjectionStore().selectedProjection,
        composite: useProjectionStore().compositeProjection,
        territoryMode: useViewStore().territoryMode,
        parallels: parameterStore.globalParameters.parallels,
        territories,
      }
    }

    async function openFranceWithSettings(view: typeof VIEWS[number]) {
      await startApplication(FRANCE)
      const compositionStore = useCompositionStore()
      await compositionStore.initializeAtlas()
      await compositionStore.selectViewMode(view)

      const viewStore = useViewStore()
      viewStore.territoryMode = useAtlasStore().currentAtlasConfig!.territoryModeOptions!.at(-1)!.value
      const projectionStore = useProjectionStore()
      if (view === 'unified' || view === 'split') {
        projectionStore.setSelectedProjection('robinson' as ProjectionId)
      }
      projectionStore.setCustomRotate({ longitude: 30, latitude: 10, gamma: 5 })
      const parameterStore = useParameterStore()
      parameterStore.setGlobalParameter('parallels', [20, 50])
      // Equal to the territory defaults, and different from the values of the composite preset
      parameterStore.setTerritoryParameter(GUADELOUPE, 'scaleMultiplier', view === 'composite-custom' ? 1 : 1.5)
      parameterStore.setTerritoryTranslation(GUADELOUPE, 'x', view === 'composite-custom' ? 0 : 12)
      parameterStore.setTerritoryTranslation(GUADELOUPE, 'y', view === 'composite-custom' ? 0 : -8)
    }

    describe.each(VIEWS)('in the %s view', (view) => {
      it.each([5, 40])('restores the state in one initialization, with files that answer in %i ms', async (milliseconds) => {
        await openFranceWithSettings(view)
        const expected = snapshot()
        const expectedRotate = useProjectionStore().customRotate!
        route.query = useUrlState().serializeState()

        await startApplication(FRANCE)
        delayFiles(milliseconds)
        const loadAtlas = vi.spyOn(useAtlasStore(), 'loadAtlas')
        await useCompositionStore().startMapView(useUrlState().readSharedLink())

        expect(loadAtlas).toHaveBeenCalledTimes(1)
        expect(snapshot()).toEqual(expected)
        useProjectionStore().customRotate!.forEach((angle, axis) => expect(angle).toBeCloseTo(expectedRotate[axis]!, 9))
      })
    })

    it('reads each key that serializeState writes', async () => {
      await openFranceWithSettings('unified')
      const state = useUrlState().serializeState()

      expect(Object.keys(state)).toEqual(expect.arrayContaining(['atlas', 'view', 'projection', 'territory', 'rlon', 'rlat', 'rgam', 'p1', 'p2', 't']))
      for (const key of Object.keys(state)) {
        const { [key]: _, ...others } = state
        expect(parseSharedLink(others), key).not.toEqual(parseSharedLink(state))
      }
    })

    it('opens another atlas in one initialization', async () => {
      route.query = { atlas: 'usa', view: 'split' }
      await startApplication(FRANCE)
      const loadAtlas = vi.spyOn(useAtlasStore(), 'loadAtlas')

      await useCompositionStore().startMapView(useUrlState().readSharedLink())

      expect(loadAtlas.mock.calls.map(([atlasId]) => atlasId)).toEqual(['usa'])
      expect(useAtlasStore().currentAtlasConfig?.id).toBe('usa')
      expect(useViewStore().viewMode).toBe('split')
      expect(useViewStore().currentViewPreset).toBe('usa-split')
    })

    it('opens the default view of the default atlas without a query', async () => {
      await startApplication(FRANCE)

      await useCompositionStore().startMapView(useUrlState().readSharedLink())

      expect(useViewStore().viewMode).toBe('composite-custom')
      expect(useProjectionStore().selectedProjection).toBe('conic-conformal')
      expect(useProjectionStore().compositeProjection).toBe('conic-conformal-france')
    })

    async function openLink(query: Record<string, string>) {
      route.query = { atlas: FRANCE, view: 'unified', ...query }
      await startApplication(FRANCE)
      await useCompositionStore().startMapView(useUrlState().readSharedLink())
    }

    it('ignores a projection that the view does not propose', async () => {
      await openLink({ projection: 'albers-usa' })

      expect(useProjectionStore().selectedProjection).toBe('natural-earth')
    })

    it('ignores a territory mode that the atlas does not have', async () => {
      await openLink({ territory: 'nowhere' })

      expect(useViewStore().territoryMode).toBe(useAtlasStore().currentAtlasConfig!.territoryModeOptions![0]!.value)
    })

    it.each([
      ['a latitude out of bounds', { rlon: '0', rlat: '200', rgam: '0' }],
      ['the same bound on a projection of another family', { projection: 'armadillo', rlon: '0', rlat: '9999', rgam: '0' }],
    ])('ignores the rotation with %s', async (_, query) => {
      await openLink(query)

      expect(useParameterStore().globalParameters.rotate).toBeUndefined()
    })

    it.each([
      ['out of bounds', { p1: '1e300', p2: '2e300' }],
      ['in the wrong order', { p1: '50', p2: '10' }],
    ])('ignores parallels %s on a projection that is not conic', async (_, query) => {
      await openLink(query)

      expect(useParameterStore().globalParameters.parallels).toBeUndefined()
    })

    it('ignores the scale and the translation out of bounds', async () => {
      await openLink({ t: '{"s_FR-GP":100,"tx_FR-GP":1e308,"ty_FR-GP":0}' })
      const parameterStore = useParameterStore()

      expect(parameterStore.getTerritoryParameters(GUADELOUPE).scaleMultiplier).not.toBe(100)
      expect(parameterStore.getTerritoryTranslation(GUADELOUPE).x).not.toBe(1e308)
    })

    it('ignores a territory that the atlas does not have', async () => {
      await openLink({ t: '{"s_NOWHERE":2}' })

      expect(useParameterStore().getTerritoryParameters('NOWHERE' as TerritoryCode).scaleMultiplier).toBeUndefined()
    })
  })
})
