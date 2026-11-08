import type { AtlasId } from '@/types/branded'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { useProjectionPanning } from '@/composables/useProjectionPanning'
import { ProjectionService } from '@/services/projection/projection-service'
import { useCompositionStore } from '@/stores/composition'
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

// Order of MapView.vue: URL, initialization, then projection parameters of the URL
async function openPage(query: Record<string, string>) {
  route.query = { atlas: ATLAS_ID, view: 'unified', ...query }
  await startApplication(ATLAS_ID)
  const urlState = useUrlState()
  urlState.restoreFromUrl()
  await useCompositionStore().startMapView()
  urlState.restoreProjectionParametersFromUrl()
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
    const viewMode = useViewStore().viewMode

    useUrlState().restoreFromUrl()

    expect(useViewStore().viewMode).toBe(viewMode)
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
})
