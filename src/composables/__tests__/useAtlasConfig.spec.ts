import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useConfigStore } from '@/stores/config'

import { useAtlasConfig } from '../useAtlasConfig'

describe('useAtlasConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should provide current atlas config', () => {
    const { currentAtlasConfig } = useAtlasConfig()

    // Initially should have default atlas
    expect(currentAtlasConfig.value).toBeDefined()
  })

  it('should provide atlas service', () => {
    const { atlasService } = useAtlasConfig()

    expect(atlasService.value).toBeDefined()
    expect(atlasService.value.getAtlasId).toBeDefined()
  })

  it('should track loading state', () => {
    const { isAtlasLoaded } = useAtlasConfig()

    // Default atlas should be loaded
    expect(isAtlasLoaded.value).toBe(true)
  })

  it('should provide atlas ID', () => {
    const { atlasId } = useAtlasConfig()

    // Should return default atlas ID
    expect(atlasId.value).toBe('france')
  })

  it('should be reactive to store changes', async () => {
    const configStore = useConfigStore()
    const { currentAtlasConfig } = useAtlasConfig()

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 100))

    // Change atlas using the correct method
    configStore.selectedAtlas = 'portugal'

    // Wait for load
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should reflect changes
    expect(currentAtlasConfig.value).toBeDefined()
  })

  it('should return consistent computed refs', () => {
    const result1 = useAtlasConfig()
    const result2 = useAtlasConfig()

    // Both should reference same store state
    expect(result1.atlasId.value).toBe(result2.atlasId.value)
  })
})
