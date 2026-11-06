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
