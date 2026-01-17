import type { Translation } from './types'
import type { useGeoDataStore } from '@/stores/geoData'
import type { useParameterStore } from '@/stores/parameters'
import type { ProjectionId, TerritoryCode } from '@/types/branded'

type GeoDataStore = ReturnType<typeof useGeoDataStore>
type ParameterStore = ReturnType<typeof useParameterStore>

/**
 * Territory data aggregated from stores
 */
export interface TerritoryData {
  code: TerritoryCode
  name: string
}

export interface TerritoryDataAggregates {
  territories: TerritoryData[]
  translations: Record<string, Translation>
  scales: Record<string, number>
  projections: Record<string, ProjectionId>
}

/**
 * Territory Data Service
 *
 * Application service (facade) for aggregating territory data from multiple stores.
 * Simplifies data access and provides a clean API for composables.
 *
 * Responsibilities:
 * - Aggregate territory data from geoDataStore
 * - Aggregate parameter data (translations, scales, projections) from parameterStore
 * - Provide single unified interface for territory data access
 *
 * Benefits:
 * - Single source of truth for territory data aggregation logic
 * - Easy to mock in tests
 * - Can add caching/optimization later
 * - Decouples composables from store implementation details
 */
export class TerritoryDataService {
  private readonly geoDataStore: GeoDataStore
  private readonly parameterStore: ParameterStore

  constructor(geoDataStore: GeoDataStore, parameterStore: ParameterStore) {
    this.geoDataStore = geoDataStore
    this.parameterStore = parameterStore
  }

  /**
   * Get all territory data aggregated from stores
   */
  getTerritoryData(): TerritoryDataAggregates {
    const territories = this.getTerritories()

    return {
      territories,
      translations: this.getTranslations(territories),
      scales: this.getScales(territories),
      projections: this.getProjections(territories),
    }
  }

  /**
   * Get list of territories
   */
  private getTerritories(): TerritoryData[] {
    return this.geoDataStore.filteredTerritories.map((t): TerritoryData => ({
      code: t.code as TerritoryCode,
      name: t.name,
    }))
  }

  /**
   * Get translations for all territories
   */
  private getTranslations(territories: TerritoryData[]): Record<string, Translation> {
    const translationsMap: Record<string, Translation> = {}
    territories.forEach((t) => {
      translationsMap[t.code] = this.parameterStore.getTerritoryTranslation(t.code)
    })
    return translationsMap
  }

  /**
   * Get scales for all territories
   */
  private getScales(territories: TerritoryData[]): Record<string, number> {
    const scalesMap: Record<string, number> = {}
    territories.forEach((t) => {
      const params = this.parameterStore.getTerritoryParameters(t.code)
      scalesMap[t.code] = params.scaleMultiplier ?? 1.0
    })
    return scalesMap
  }

  /**
   * Get projections for all territories
   */
  private getProjections(territories: TerritoryData[]): Record<string, ProjectionId> {
    // Trigger reactivity
    void this.parameterStore.territoryParametersVersion

    const projectionsMap: Record<string, ProjectionId> = {}
    territories.forEach((t) => {
      const projectionId = this.parameterStore.getTerritoryProjection(t.code)
      if (projectionId) {
        projectionsMap[t.code] = projectionId
      }
    })
    return projectionsMap
  }
}
