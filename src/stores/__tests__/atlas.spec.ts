import type { AtlasId } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { err } from '@/core/types/result'
import { useAtlasStore } from '@/stores/atlas'

const FRANCE = 'france' as AtlasId
const PORTUGAL = 'portugal' as AtlasId
const USA = 'usa' as AtlasId

describe('atlas store', () => {
  beforeAll(async () => {
    await loadAtlasFromConfigs(FRANCE)
    await loadAtlasFromConfigs(PORTUGAL)
  })

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the configuration of the selected atlas when another atlas finishes loading', async () => {
    const atlasStore = useAtlasStore()
    atlasStore.selectedAtlasId = FRANCE

    await atlasStore.loadAtlas(PORTUGAL)

    expect(atlasStore.currentAtlasConfig?.id).toBe(FRANCE)
  })

  it('gives the configuration of the selected atlas once loaded', async () => {
    const atlasStore = useAtlasStore()
    atlasStore.selectedAtlasId = PORTUGAL

    await atlasStore.loadAtlas(PORTUGAL)

    expect(atlasStore.currentAtlasConfig?.id).toBe(PORTUGAL)
  })

  it('fails for an atlas that is not in the registry', async () => {
    const result = await useAtlasStore().loadAtlas('nowhere' as AtlasId)

    expect(result).toEqual(err({ code: 'ATLAS_UNKNOWN', atlasId: 'nowhere' }))
  })

  it('fails for a configuration without the required fields', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}'))

    const result = await useAtlasStore().loadAtlas(USA)

    expect(result).toEqual(err({ code: 'ATLAS_CONFIG_INVALID', atlasId: USA }))
  })

  it('leaves the current configuration when the file is missing', async () => {
    const atlasStore = useAtlasStore()
    atlasStore.selectedAtlasId = USA
    atlasStore.currentAtlasConfig = undefined
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))

    const result = await atlasStore.loadAtlas(USA)

    expect(result).toEqual(err({ code: 'JSON_FILE_NOT_FOUND', path: '/configs/atlases/usa.json' }))
    expect(atlasStore.currentAtlasConfig).toBeUndefined()
  })
})
