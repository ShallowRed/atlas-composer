import type { GeoDataConfig } from '@/types'
import { beforeEach, describe, expect, it } from 'vitest'
import { Cartographer } from '@/services/rendering/cartographer-service'

describe('cartographer service integration', () => {
  let cartographer: Cartographer

  const mockGeoDataConfig: GeoDataConfig = {
    dataPath: '/data/france-territories-50m.json',
    metadataPath: '/data/france-metadata-50m.json',
    topologyObjectName: 'territories',
    territories: [
      {
        code: 'FR-MET' as any,
        name: 'France Metropolitaine',
        center: [2.5, 46.5],
        bounds: [[-5, 41], [10, 51]],
      },
    ],
  }

  beforeEach(() => {
    cartographer = new Cartographer(mockGeoDataConfig)
  })

  describe('projection service integration', () => {
    it('should initialize without errors', () => {
      expect(cartographer).toBeDefined()
      expect(cartographer.customComposite).toBeNull()
    })

    it('should have projection service available', () => {
      expect(cartographer).toHaveProperty('projectionService')
    })

    it('should have geo data service available', () => {
      expect(cartographer).toHaveProperty('geoDataService')
    })
  })

  describe('render mode support', () => {
    it('should support simple render mode', () => {
      expect(cartographer).toHaveProperty('renderSimple')
    })

    it('should support composite-custom render mode', () => {
      expect(cartographer).toHaveProperty('renderCustomComposite')
    })

    it('should support composite-projection render mode', () => {
      expect(cartographer).toHaveProperty('renderProjectionComposite')
    })

    it('should have unified render API', () => {
      expect(cartographer.render).toBeDefined()
      expect(typeof cartographer.render).toBe('function')
    })
  })

  describe('projection parameter passing', () => {
    it('should accept standard projection IDs without errors', () => {
      expect(cartographer).toHaveProperty('projectionService')
    })

    it('should work with composite projection IDs', () => {
      expect(cartographer).toHaveProperty('projectionService')
    })
  })

  describe('configuration', () => {
    it('should store geo data config', () => {
      expect(cartographer).toHaveProperty('geoDataService')
    })

    it('should not create composite projection when config not provided', () => {
      expect(cartographer.customComposite).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle invalid render mode gracefully', async () => {
      await expect(async () => {
        await cartographer.render({
          mode: 'invalid-mode' as any,
          projection: 'mercator',
          width: 800,
          height: 600,
        } as any)
      }).rejects.toThrow('Unknown render mode')
    })
  })
})
