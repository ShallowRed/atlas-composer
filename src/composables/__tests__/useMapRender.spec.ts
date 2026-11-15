import type { MockInstance } from 'vitest'
import type { AtlasId } from '@/types/branded'
import { geoMercator } from 'd3-geo'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { withSetup } from '@/__tests__/test-utils'
import { useMapRender } from '@/composables/useMapRender'
import { ok } from '@/core/types/result'
import { renderBasemap } from '@/services/rendering/basemap-renderer'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { useGeoDataStore } from '@/stores/geoData'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { createProjectionId } from '@/types/branded'

vi.mock('@/services/rendering/basemap-renderer', () => ({ renderBasemap: vi.fn() }))

const props = { mode: 'composite' as const, geoData: null, width: 960, height: 500, preserveScale: false }

let urls = 0
let createObjectURL: MockInstance<typeof URL.createObjectURL>
let revokeObjectURL: MockInstance<typeof URL.revokeObjectURL>

beforeEach(async () => {
  urls = 0
  await startApplication('france' as AtlasId)
  vi.useFakeTimers()
  createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++urls}`)
  revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(MapRenderCoordinator, 'insertBasemap').mockImplementation(() => {})
  useUIStore().basemap = 'imagery'
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  useUIStore().basemap = 'none'
})

const svg = () => document.createElementNS('http://www.w3.org/2000/svg', 'svg')

describe('basemap of a map', () => {
  it('keeps the result of each map apart', async () => {
    vi.mocked(renderBasemap)
      .mockResolvedValueOnce(ok({ image: new Blob(), missingTiles: 1 }))
      .mockResolvedValueOnce(ok({ image: new Blob(), missingTiles: 1 }))
      .mockResolvedValueOnce(ok({ image: new Blob(), missingTiles: 2 }))
      .mockResolvedValueOnce(ok({ image: new Blob(), missingTiles: 2 }))
    const first = withSetup(() => useMapRender(props))
    const second = withSetup(() => useMapRender(props))

    first.applyBasemap(svg())
    await vi.runAllTimersAsync()
    second.applyBasemap(svg())
    await vi.runAllTimersAsync()

    expect(first.basemapResult.value?.ok && first.basemapResult.value.value.missingTiles).toBe(1)
    expect(second.basemapResult.value?.ok && second.basemapResult.value.value.missingTiles).toBe(2)
  })

  it('releases the image of the previous pass at each insertion, and the last one when disposed', async () => {
    vi.mocked(renderBasemap).mockResolvedValue(ok({ image: new Blob(), missingTiles: 0 }))
    const map = withSetup(() => useMapRender(props))

    map.applyBasemap(svg())
    await vi.runAllTimersAsync()
    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:1')

    map.dispose()
    expect(revokeObjectURL).toHaveBeenLastCalledWith('blob:2')
  })

  it('interrupts the render in progress when disposed', async () => {
    let signal: AbortSignal | undefined
    vi.mocked(renderBasemap).mockImplementation(async (_frames, _source, options) => {
      signal = options.signal
      return new Promise(() => {})
    })
    const map = withSetup(() => useMapRender(props))

    map.applyBasemap(svg())
    await vi.advanceTimersByTimeAsync(200)
    map.dispose()

    expect(signal?.aborted).toBe(true)
  })

  it('draws the basemap of each map from the frames of its own render', async () => {
    vi.mocked(renderBasemap).mockResolvedValue(ok({ image: new Blob(), missingTiles: 0 }))
    const frame = (code: string) => ({ code, projection: geoMercator(), extent: [[0, 0], [10, 10]] as [[number, number], [number, number]] })
    vi.spyOn(MapRenderCoordinator, 'renderCompositeMap')
      .mockResolvedValueOnce({ svg: svg(), frames: [frame('A')] })
      .mockResolvedValueOnce({ svg: svg(), frames: [frame('B')] })
    // renderCompositeMap is mocked: renderComposite needs a cartographer and a selected projection
    useGeoDataStore().cartographer = {} as never
    useProjectionStore().selectedProjection = createProjectionId('conic-conformal')
    const first = withSetup(() => useMapRender(props))
    const second = withSetup(() => useMapRender(props))

    await first.renderSvg()
    await second.renderSvg()
    first.applyBasemap(svg())
    second.applyBasemap(svg())
    await vi.runAllTimersAsync()

    const codes = vi.mocked(renderBasemap).mock.calls.map(([frames]) => frames.map(({ code }) => code).join())
    expect(new Set(codes)).toEqual(new Set(['A', 'B']))
  })

  it('draws once for two renders within 200 ms, and in one pass for a vector basemap', async () => {
    vi.mocked(renderBasemap).mockResolvedValue(ok({ image: new Blob(), missingTiles: 0 }))
    useUIStore().basemap = 'streets'
    const map = withSetup(() => useMapRender(props))

    map.applyBasemap(svg())
    await vi.advanceTimersByTimeAsync(100)
    map.applyBasemap(svg())
    await vi.runAllTimersAsync()

    expect(renderBasemap).toHaveBeenCalledTimes(1)
  })

  it('forgets the result once the basemap is none', async () => {
    vi.mocked(renderBasemap).mockResolvedValue(ok({ image: new Blob(), missingTiles: 3 }))
    const map = withSetup(() => useMapRender(props))

    map.applyBasemap(svg())
    await vi.runAllTimersAsync()
    useUIStore().basemap = 'none'
    map.applyBasemap(svg())

    expect(map.basemapResult.value).toBeNull()
  })
})
