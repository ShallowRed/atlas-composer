import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useAtlasData } from '../useAtlasData'

describe('useAtlasData', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('showSkeleton', () => {
    it('should initialize showSkeleton as false', () => {
      const { showSkeleton } = useAtlasData()
      expect(showSkeleton.value).toBe(false)
    })
  })

  describe('initialize', () => {
    it('should be a function', () => {
      const { initialize } = useAtlasData()
      expect(typeof initialize).toBe('function')
    })

    it('should return a promise', () => {
      const { initialize } = useAtlasData()
      const result = initialize()
      expect(result).toBeInstanceOf(Promise)
      // Catch the promise to prevent unhandled rejection
      result.catch(() => {})
    })
  })

  describe('reinitialize', () => {
    it('should be a function', () => {
      const { reinitialize } = useAtlasData()
      expect(typeof reinitialize).toBe('function')
    })

    it('should return a promise', () => {
      const { reinitialize } = useAtlasData()
      const result = reinitialize()
      expect(result).toBeInstanceOf(Promise)
      // Catch the promise to prevent unhandled rejection
      result.catch(() => {})
    })
  })

  describe('reloadUnifiedData', () => {
    it('should be a function', () => {
      const { reloadUnifiedData } = useAtlasData()
      expect(typeof reloadUnifiedData).toBe('function')
    })

    it('should return a promise', () => {
      const { reloadUnifiedData } = useAtlasData()
      const result = reloadUnifiedData()
      expect(result).toBeInstanceOf(Promise)
      // Catch the promise to prevent unhandled rejection
      result.catch(() => {})
    })
  })

  describe('integration with stores', () => {
    it('should work with config store', () => {
      const configStore = useConfigStore()
      const { initialize } = useAtlasData()

      expect(configStore).toBeDefined()
      expect(typeof initialize).toBe('function')
    })

    it('should work with geoData store', () => {
      const geoDataStore = useGeoDataStore()
      const { initialize } = useAtlasData()

      expect(geoDataStore).toBeDefined()
      expect(typeof initialize).toBe('function')
    })
  })
})
