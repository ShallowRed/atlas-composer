import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { InitializationService } from '@/services/initialization/initialization-service'
import { useAtlasStore } from '@/stores/atlas'
import { useViewStore } from '@/stores/view'
import { createAtlasId } from '@/types/branded'

vi.mock('@/services/initialization/initialization-service', () => ({
  InitializationService: { initializeAtlas: vi.fn() },
}))

describe('view store', () => {
  beforeAll(async () => {
    await loadAtlasFromConfigs(createAtlasId('france'))
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(InitializationService.initializeAtlas).mockReset()
  })

  it('initializes the previous atlas again when an atlas change fails', async () => {
    vi.mocked(InitializationService.initializeAtlas)
      .mockResolvedValueOnce({ success: false, errors: ['Preset not found'], warnings: [], state: null })
      .mockResolvedValueOnce({ success: true, errors: [], warnings: [], state: null })
    useViewStore()
    const atlasStore = useAtlasStore()

    atlasStore.selectedAtlasId = createAtlasId('europe')
    await flushPromises()

    expect(atlasStore.selectedAtlasId).toBe('france')
    expect(vi.mocked(InitializationService.initializeAtlas).mock.calls.map(([options]) => options.atlasId))
      .toEqual(['europe', 'france'])
  })
})
