import type { useGeoDataStore } from '@/stores/geoData'
import type { useParameterStore } from '@/stores/parameters'
import { describe, expect, it, vi } from 'vitest'
import { TerritoryDataService } from '../territory-data-service'

type GeoDataStore = ReturnType<typeof useGeoDataStore>
type ParameterStore = ReturnType<typeof useParameterStore>

describe('territoryDataService', () => {
  const createMockGeoDataStore = (): Partial<GeoDataStore> => ({
    filteredTerritories: [
      { code: 'FR-GP', name: 'Guadeloupe', area: 1000, region: 'Caribbean', data: { type: 'FeatureCollection', features: [] } },
      { code: 'FR-MQ', name: 'Martinique', area: 1000, region: 'Caribbean', data: { type: 'FeatureCollection', features: [] } },
    ] as any,
  })

  const createMockParameterStore = (): Partial<ParameterStore> => ({
    territoryParametersVersion: 1,
    getTerritoryTranslation: vi.fn((code: string) => {
      if (code === 'FR-GP')
        return { x: 100, y: 50 }
      if (code === 'FR-MQ')
        return { x: 200, y: 100 }
      return { x: 0, y: 0 }
    }),
    getTerritoryParameters: vi.fn((code: string) => {
      if (code === 'FR-GP')
        return { scaleMultiplier: 1.5 }
      if (code === 'FR-MQ')
        return { scaleMultiplier: 2.0 }
      return {}
    }),
    getTerritoryProjection: vi.fn((code: string) => {
      if (code === 'FR-GP')
        return 'mercator' as any
      if (code === 'FR-MQ')
        return 'azimuthal-equal-area' as any
      return undefined
    }),
  })

  describe('getTerritoryData', () => {
    it('should aggregate all territory data', () => {
      const geoDataStore = createMockGeoDataStore() as GeoDataStore
      const parameterStore = createMockParameterStore() as ParameterStore
      const service = new TerritoryDataService(geoDataStore, parameterStore)

      const result = service.getTerritoryData()

      expect(result.territories).toHaveLength(2)
      expect(result.territories[0]).toEqual({
        code: 'FR-GP',
        name: 'Guadeloupe',
      })
      expect(result.territories[1]).toEqual({
        code: 'FR-MQ',
        name: 'Martinique',
      })

      expect(result.translations['FR-GP']).toEqual({ x: 100, y: 50 })
      expect(result.translations['FR-MQ']).toEqual({ x: 200, y: 100 })

      expect(result.scales['FR-GP']).toBe(1.5)
      expect(result.scales['FR-MQ']).toBe(2.0)

      expect(result.projections['FR-GP']).toBe('mercator')
      expect(result.projections['FR-MQ']).toBe('azimuthal-equal-area')
    })

    it('should handle missing scale multiplier with default', () => {
      const geoDataStore = createMockGeoDataStore() as GeoDataStore
      const parameterStore = {
        ...createMockParameterStore(),
        getTerritoryParameters: vi.fn(() => ({})), // No scaleMultiplier
      } as ParameterStore

      const service = new TerritoryDataService(geoDataStore, parameterStore)
      const result = service.getTerritoryData()

      expect(result.scales['FR-GP']).toBe(1.0)
      expect(result.scales['FR-MQ']).toBe(1.0)
    })

    it('should handle missing projection by not including it', () => {
      const geoDataStore = createMockGeoDataStore() as GeoDataStore
      const parameterStore = {
        ...createMockParameterStore(),
        getTerritoryProjection: vi.fn(() => undefined),
      } as ParameterStore

      const service = new TerritoryDataService(geoDataStore, parameterStore)
      const result = service.getTerritoryData()

      expect(result.projections).toEqual({})
    })

    it('should handle empty territories', () => {
      const geoDataStore = {
        filteredTerritories: [],
      } as unknown as GeoDataStore
      const parameterStore = createMockParameterStore() as ParameterStore

      const service = new TerritoryDataService(geoDataStore, parameterStore)
      const result = service.getTerritoryData()

      expect(result.territories).toHaveLength(0)
      expect(result.translations).toEqual({})
      expect(result.scales).toEqual({})
      expect(result.projections).toEqual({})
    })

    it('should call stores correctly', () => {
      const geoDataStore = createMockGeoDataStore() as GeoDataStore
      const parameterStore = createMockParameterStore() as ParameterStore

      const service = new TerritoryDataService(geoDataStore, parameterStore)
      service.getTerritoryData()

      expect(parameterStore.getTerritoryTranslation).toHaveBeenCalledWith('FR-GP')
      expect(parameterStore.getTerritoryTranslation).toHaveBeenCalledWith('FR-MQ')
      expect(parameterStore.getTerritoryParameters).toHaveBeenCalledWith('FR-GP')
      expect(parameterStore.getTerritoryParameters).toHaveBeenCalledWith('FR-MQ')
      expect(parameterStore.getTerritoryProjection).toHaveBeenCalledWith('FR-GP')
      expect(parameterStore.getTerritoryProjection).toHaveBeenCalledWith('FR-MQ')
    })
  })
})
