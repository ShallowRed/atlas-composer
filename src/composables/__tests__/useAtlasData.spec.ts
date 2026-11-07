import type { AtlasId } from '@/types/branded'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { useAtlasData } from '@/composables/useAtlasData'
import { useGeoDataStore } from '@/stores/geoData'

const ATLAS_ID = 'france' as AtlasId

async function initializeWithMissingFile(notFoundPath: string) {
  await startApplication(ATLAS_ID)
  const geoDataStore = useGeoDataStore()
  vi.mocked(geoDataStore.reinitialize).mockRestore()
  vi.mocked(geoDataStore.loadAllAtlasData).mockRestore()
  vi.stubGlobal('fetch', async (url: string) => url.includes(notFoundPath)
    ? new Response('', { status: 404 })
    : new Response(await readFile(`.${url}`, 'utf8')))

  await useAtlasData().initialize()
  return geoDataStore
}

describe('useAtlasData.initialize', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes the error of the geographic data in the geoData store', async () => {
    const geoDataStore = await initializeWithMissingFile('/data/')

    expect(geoDataStore.error).toContain('GEODATA_NOT_FOUND')
    expect(geoDataStore.isReinitializing).toBe(false)
  })

  it('writes the failure of the default preset in the geoData store', async () => {
    const geoDataStore = await initializeWithMissingFile('/presets/')

    expect(geoDataStore.error).toContain('Failed to load default preset')
  })
})
