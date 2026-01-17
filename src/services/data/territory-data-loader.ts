import type { Territory } from '@/stores/geoData'
import type { TerritoryConfig } from '@/types'

import { getTerritoriesForMode } from '@/core/atlases/utils'

// Using any for GeoDataService to avoid circular dependency and complex type issues
type GeoDataService = any

/**
 * Result of territory data loading operation
 */
export interface TerritoryLoadResult {
  /** All territories */
  territories: Territory[]
}

/**
 * Result of unified data loading operation
 */
export interface UnifiedDataLoadResult {
  data: GeoJSON.FeatureCollection
}

/**
 * Territory data loader
 * Loads all territories as equals (no hierarchy)
 */
export class TerritoryDataLoader {
    static create(): TerritoryDataLoader {
    return new TerritoryDataLoader()
  }

  /**
   * Load territory data
   * All territories are loaded and treated equally
   */
  async loadTerritories(service: GeoDataService): Promise<TerritoryLoadResult> {
    const allTerritoriesData = await service.getAllTerritories()

    if (allTerritoriesData.length === 0) {
      return { territories: [] }
    }

    // All territories as Territory objects
    const territories: Territory[] = allTerritoriesData.map((territoryData: any) => ({
      name: territoryData.territory.name,
      code: territoryData.territory.code,
      area: territoryData.territory.area,
      region: territoryData.territory.region || 'Other',
      data: {
        type: 'FeatureCollection' as const,
        features: [territoryData.feature],
      },
    }))

    return { territories }
  }

  /**
   * Load unified data for composite views
   * Handles territory filtering based on mode
   */
  async loadUnifiedData(
    service: GeoDataService,
    mode: string,
    options: {
      atlasConfig: any
      atlasService: any
      hasTerritorySelector: boolean
      isWildcard: boolean
    },
  ): Promise<UnifiedDataLoadResult> {
    let territoryCodes: readonly string[] | undefined

    // Check if atlas has territory modes for filtering
    if (!options.hasTerritorySelector) {
      // No territory modes defined: include all territories
      territoryCodes = undefined
    }
    else {
      // Get territory codes based on atlas type
      let allTerritories: TerritoryConfig[]

      if (options.isWildcard) {
        // For wildcard atlases, get territories from GeoDataService (loaded from data file)
        const geoTerritories = await service.getAllTerritories()

        // Convert Territory to TerritoryConfig format
        allTerritories = geoTerritories.map((gt: any) => ({
          code: gt.territory.code,
          name: gt.territory.name,
          center: gt.territory.center || [0, 0],
          offset: [0, 0],
          bounds: gt.territory.bounds
            ? [[gt.territory.bounds[0], gt.territory.bounds[1]], [gt.territory.bounds[2], gt.territory.bounds[3]]]
            : [[-180, -90], [180, 90]],
        }))
      }
      else {
        // For regular atlases, get territories from registry (static config)
        allTerritories = options.atlasService.getAllTerritories()
      }

      const territoryModes = options.atlasService.getTerritoryModes()
      const allowedTerritories = getTerritoriesForMode(
        allTerritories,
        mode,
        territoryModes,
      )
      territoryCodes = allowedTerritories.map(t => t.code)
    }

    const data = await service.getRawUnifiedData(mode, territoryCodes)
    if (!data) {
      throw new Error('Failed to load unified data')
    }
    return { data }
  }
}
