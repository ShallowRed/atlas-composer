import type { MockInstance } from 'vitest'
import type { AtlasId } from '@/types/branded'
import { geoConicConformal, geoMercator } from 'd3-geo'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { withSetup } from '@/__tests__/test-utils'
import { useMapRender } from '@/composables/useMapRender'
import { err, ok } from '@/core/types/result'
import { cachedBasemap, renderBasemap } from '@/services/rendering/basemap-renderer'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { useGeoDataStore } from '@/stores/geoData'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { createProjectionId } from '@/types/branded'

vi.mock('@/services/rendering/basemap-renderer', () => ({ renderBasemap: vi.fn(), cachedBasemap: vi.fn() }))

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
  vi.mocked(cachedBasemap).mockResolvedValue(null)
  useUIStore().basemap = 'imagery'
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  useUIStore().basemap = 'none'
})

// The placements of the last provisional image
function lastPlacements() {
  const options = vi.mocked(MapRenderCoordinator.insertBasemap).mock.lastCall?.[2]
  return options && 'placements' in options ? options.placements : undefined
}

// The fingerprint that the last insertion gave to its image
function lastFingerprint() {
  const options = vi.mocked(MapRenderCoordinator.insertBasemap).mock.lastCall?.[2]
  return options && 'fingerprint' in options ? options.fingerprint : undefined
}

// The svg of a render of the map, with the viewBox that the renderer sets
function svg() {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  element.setAttribute('viewBox', '0 0 960 500')
  return element
}

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

  it('tells that the basemap loads until its last pass, and stops telling when interrupted', async () => {
    let finishSecondPass = () => {}
    vi.mocked(renderBasemap)
      .mockResolvedValueOnce(ok({ image: new Blob(), missingTiles: 0 }))
      .mockReturnValueOnce(new Promise(resolve => finishSecondPass = () => resolve(ok({ image: new Blob(), missingTiles: 0 }))))
      .mockReturnValueOnce(new Promise(() => {}))
    const map = withSetup(() => useMapRender(props))

    map.applyBasemap(svg())
    expect(map.basemapLoading.value).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(map.basemapLoading.value).toBe(true)
    finishSecondPass()
    await vi.runAllTimersAsync()
    expect(map.basemapLoading.value).toBe(false)

    map.applyBasemap(svg())
    await vi.advanceTimersByTimeAsync(200)
    map.dispose()
    expect(map.basemapLoading.value).toBe(false)
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

  it('removes the basemap and forgets the result once the basemap is none', async () => {
    vi.mocked(renderBasemap).mockResolvedValue(ok({ image: new Blob(), missingTiles: 3 }))
    const remove = vi.spyOn(MapRenderCoordinator, 'removeBasemap')
    const map = withSetup(() => useMapRender(props))
    const rendered = svg()

    map.applyBasemap(rendered)
    await vi.runAllTimersAsync()
    useUIStore().basemap = 'none'
    map.applyBasemap(rendered)

    expect(remove).toHaveBeenCalledExactlyOnceWith(rendered)
    expect(map.basemapResult.value).toBeNull()
  })
})

describe('provisional basemap image', () => {
  // A frame of France whose projection and extent move by dx between two renders of the map
  const franceFrame = (dx: number) => ({
    code: 'FR',
    projection: geoConicConformal().rotate([-3, -46.5]).parallels([44, 49]).scale(2600).translate([480 + dx, 250]),
    extent: [[200 + dx, 50], [760 + dx, 450]] as [[number, number], [number, number]],
  })

  async function renderAt(map: ReturnType<typeof useMapRender>, dx: number) {
    vi.spyOn(MapRenderCoordinator, 'renderCompositeMap').mockResolvedValueOnce({ svg: svg(), frames: [franceFrame(dx)] })
    const rendered = await map.renderSvg()
    map.applyBasemap(rendered!)
  }

  beforeEach(() => {
    // renderCompositeMap is mocked: renderComposite needs a cartographer and a selected projection
    useGeoDataStore().cartographer = {} as never
    useProjectionStore().selectedProjection = createProjectionId('conic-conformal')
    vi.mocked(renderBasemap).mockResolvedValue(ok({ image: new Blob(), missingTiles: 0 }))
  })

  it('places the previous image on a frame that moved before the next render, then draws in one pass', async () => {
    const map = withSetup(() => useMapRender(props))
    await renderAt(map, 0)
    await vi.runAllTimersAsync()
    vi.mocked(renderBasemap).mockClear()

    await renderAt(map, 40)

    const placements = lastPlacements()
    expect(placements?.map(({ code }) => code)).toEqual(['FR'])
    expect(placements?.[0]!.to[0][0]).toBeCloseTo(placements![0]!.from[0][0] + 40, 3)
    await vi.runAllTimersAsync()
    expect(renderBasemap).toHaveBeenCalledTimes(1)
  })

  it('places the previous image on the frame that moved only, then draws in one pass', async () => {
    const map = withSetup(() => useMapRender(props))
    const reunion = (rotation: number) => ({
      code: 'RE',
      projection: geoMercator().rotate([rotation, 0]).scale(4000).translate([850, 400]),
      extent: [[800, 350], [900, 450]] as [[number, number], [number, number]],
    })
    const renderWithReunion = async (dx: number, rotation: number) => {
      vi.spyOn(MapRenderCoordinator, 'renderCompositeMap').mockResolvedValueOnce({ svg: svg(), frames: [franceFrame(dx), reunion(rotation)] })
      map.applyBasemap((await map.renderSvg())!)
    }
    await renderWithReunion(0, -55.5)
    await vi.runAllTimersAsync()
    vi.mocked(renderBasemap).mockClear()

    await renderWithReunion(40, -50)

    expect(lastPlacements()?.map(({ code }) => code)).toEqual(['FR'])
    await vi.runAllTimersAsync()
    expect(renderBasemap).toHaveBeenCalledTimes(1)
  })

  it('places no previous image after a change of source', async () => {
    const map = withSetup(() => useMapRender(props))
    await renderAt(map, 0)
    await vi.runAllTimersAsync()
    vi.mocked(MapRenderCoordinator.insertBasemap).mockClear()

    useUIStore().basemap = 'relief'
    await renderAt(map, 40)

    expect(MapRenderCoordinator.insertBasemap).not.toHaveBeenCalled()
  })

  it('removes the basemap after an error of its render, and places no previous image on the next render', async () => {
    const remove = vi.spyOn(MapRenderCoordinator, 'removeBasemap')
    const map = withSetup(() => useMapRender(props))
    await renderAt(map, 0)
    await vi.runAllTimersAsync()
    vi.mocked(renderBasemap).mockResolvedValue(err({ code: 'BASEMAP_TILES_FAILED', missingTiles: 4 }))
    await renderAt(map, 40)
    await vi.runAllTimersAsync()
    vi.mocked(MapRenderCoordinator.insertBasemap).mockClear()

    await renderAt(map, 80)

    expect(remove).toHaveBeenCalled()
    expect(MapRenderCoordinator.insertBasemap).not.toHaveBeenCalled()
  })
})

describe('cached image of a raster basemap', () => {
  const franceFrame = (dx: number) => ({
    code: 'FR',
    projection: geoConicConformal().rotate([-3, -46.5]).parallels([44, 49]).scale(2600).translate([480 + dx, 250]),
    extent: [[200 + dx, 50], [760 + dx, 450]] as [[number, number], [number, number]],
  })

  async function renderAt(map: ReturnType<typeof useMapRender>, dx: number) {
    vi.spyOn(MapRenderCoordinator, 'renderCompositeMap').mockResolvedValueOnce({ svg: svg(), frames: [franceFrame(dx)] })
    const rendered = await map.renderSvg()
    map.applyBasemap(rendered!)
  }

  beforeEach(() => {
    // renderCompositeMap is mocked: renderComposite needs a cartographer and a selected projection
    useGeoDataStore().cartographer = {} as never
    useProjectionStore().selectedProjection = createProjectionId('conic-conformal')
    useUIStore().basemap = 'relief'
    vi.mocked(renderBasemap).mockResolvedValue(ok({ image: new Blob(), missingTiles: 0 }))
  })

  it('shows the cached image with its fingerprint and renders nothing', async () => {
    vi.mocked(cachedBasemap).mockResolvedValue(new Blob())
    const map = withSetup(() => useMapRender(props))

    await renderAt(map, 0)
    await vi.runAllTimersAsync()

    expect(cachedBasemap).toHaveBeenCalledOnce()
    expect(lastFingerprint()).toBe(vi.mocked(cachedBasemap).mock.calls[0]![0])
    expect(renderBasemap).not.toHaveBeenCalled()
    expect(map.basemapResult.value?.ok && map.basemapResult.value.value.missingTiles).toBe(0)
    expect(map.basemapLoading.value).toBe(false)
  })

  it('renders both passes without a cached image, not before 200 ms on the first render, and gives the fingerprint to the complete pass only', async () => {
    const map = withSetup(() => useMapRender(props))

    await renderAt(map, 0)
    await vi.advanceTimersByTimeAsync(199)
    expect(renderBasemap).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()

    expect(renderBasemap).toHaveBeenCalledTimes(2)
    const fingerprints = vi.mocked(MapRenderCoordinator.insertBasemap).mock.calls.map(([, , options]) => options && 'fingerprint' in options ? options.fingerprint : undefined)
    expect(fingerprints).toEqual([undefined, vi.mocked(cachedBasemap).mock.calls[0]![0]])
  })

  it('gives no fingerprint to a final pass with missing tiles', async () => {
    vi.mocked(renderBasemap).mockResolvedValue(ok({ image: new Blob(), missingTiles: 1 }))
    const map = withSetup(() => useMapRender(props))

    await renderAt(map, 0)
    await vi.runAllTimersAsync()

    expect(lastFingerprint()).toBeUndefined()
  })

  it('keeps the cached image when the map draws again with the same frames, and places it as the provisional image of other frames', async () => {
    vi.mocked(cachedBasemap).mockResolvedValueOnce(new Blob())
    const map = withSetup(() => useMapRender(props))
    await renderAt(map, 0)
    await vi.runAllTimersAsync()
    vi.mocked(MapRenderCoordinator.insertBasemap).mockClear()

    await renderAt(map, 0)
    await vi.runAllTimersAsync()
    expect(cachedBasemap).toHaveBeenCalledOnce()
    expect(renderBasemap).not.toHaveBeenCalled()
    expect(lastFingerprint()).toBe(vi.mocked(cachedBasemap).mock.calls[0]![0])

    await renderAt(map, 40)
    expect(lastPlacements()?.map(({ code }) => code)).toEqual(['FR'])
  })

  it('renders nothing when interrupted between the answer of the cache and the end of the delay', async () => {
    const map = withSetup(() => useMapRender(props))

    await renderAt(map, 0)
    await vi.advanceTimersByTimeAsync(100)
    expect(cachedBasemap).toHaveBeenCalledOnce()
    map.dispose()
    await vi.runAllTimersAsync()

    expect(renderBasemap).not.toHaveBeenCalled()
    expect(map.basemapLoading.value).toBe(false)
  })

  it('shows nothing when interrupted while the cached image loads', async () => {
    let finish = (_image: Blob | null) => {}
    vi.mocked(cachedBasemap).mockReturnValueOnce(new Promise(resolve => finish = resolve))
    const map = withSetup(() => useMapRender(props))

    await renderAt(map, 0)
    map.dispose()
    finish(new Blob())
    await vi.runAllTimersAsync()

    expect(MapRenderCoordinator.insertBasemap).not.toHaveBeenCalled()
    expect(renderBasemap).not.toHaveBeenCalled()
  })
})
