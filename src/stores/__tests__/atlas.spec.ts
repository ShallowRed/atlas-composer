import type { AtlasId } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { useAtlasStore } from '@/stores/atlas'

const FRANCE = 'france' as AtlasId
const PORTUGAL = 'portugal' as AtlasId

describe('atlas store', () => {
  beforeAll(async () => {
    await loadAtlasFromConfigs(FRANCE)
    await loadAtlasFromConfigs(PORTUGAL)
  })

  beforeEach(() => {
    setActivePinia(createPinia())
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
})
