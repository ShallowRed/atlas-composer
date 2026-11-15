import { readFile } from 'node:fs/promises'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMPOSITION_PRESETS, EXAMPLES } from '@/core/examples'
import { useExamplesStore } from '@/stores/examples'

describe('loadExampleMap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gives the error of a missing data file', async () => {
    vi.stubGlobal('fetch', async (url: string) => url.includes('examples/')
      ? new Response('', { status: 404 })
      : new Response(await readFile(`.${url}`, 'utf8')))

    const result = await useExamplesStore().loadExampleMap(EXAMPLES[0]!)

    expect(!result.ok && result.error.code).toBe('JSON_FILE_NOT_FOUND')
  })
})

describe('loadEarthquakes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the feed once, and keeps the earthquakes that have a position and a magnitude', async () => {
    const feed = vi.fn(async () => Response.json({ features: [
      { geometry: { coordinates: [142, 38, 10] }, properties: { mag: 4.2, place: 'off the coast', time: 1 } },
      { geometry: { coordinates: [142, 38, 10] }, properties: { mag: null, place: 'no magnitude', time: 2 } },
    ] }))
    vi.stubGlobal('fetch', feed)
    const store = useExamplesStore()

    const [first, second] = await Promise.all([store.loadEarthquakes(), store.loadEarthquakes()])

    expect(first).toEqual([{ longitude: 142, latitude: 38, magnitude: 4.2, label: 'off the coast', time: 1 }])
    expect(second).toBe(first)
    expect(feed).toHaveBeenCalledOnce()
    expect(store.earthquakesUnavailable).toBe(false)
  })

  it.each([
    ['an unreachable feed', async () => Promise.reject(new TypeError('network'))],
    ['a response without features', async () => Response.json({ type: 'FeatureCollection' })],
  ])('gives no earthquake and marks the feed unavailable for %s', async (_case, response) => {
    vi.stubGlobal('fetch', response)
    const store = useExamplesStore()

    expect(await store.loadEarthquakes()).toEqual([])
    expect(store.earthquakesUnavailable).toBe(true)
  })
})

describe('loadCompositionDemo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // The configurations are served from configs/, the data from src/public/
    vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(`.${url.replace(/^\/(?!configs\/)/, '/src/public/')}`, 'utf8')))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gives the preset, the contours of its atlas, the places and the names of the territories', async () => {
    const result = await useExamplesStore().loadCompositionDemo(COMPOSITION_PRESETS[0]!)

    expect(result.ok).toBe(true)
    const source = result.ok ? result.value : null
    expect(source?.input.territories.features.map(({ properties }) => properties.code)).toContain('JP-RYU')
    expect(source?.input.places.length).toBeGreaterThan(1000)
    expect(source?.territoryNames.has('JP-01')).toBe(true)
  })
})
