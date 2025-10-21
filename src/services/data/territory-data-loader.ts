import type { Territory } from '@/stores/geoData'
import type { TerritoryConfig } from '@/types'

import { getTerritoriesForMode } from '@/core/atlases/utils'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { logger } from '@/utils/logger'

const debug = logger.data.loader

// Using any for GeoDataService to avoid circular dependency and complex type issues
type GeoDataService = any

/**
 * Result of territory data loading operation
 */
export interface TerritoryLoadResult {
  mainlandData: GeoJSON.FeatureCollection | null
  territories: Territory[]
}

/**
 * Result of unified data loading operation
 */
export interface UnifiedDataLoadResult {
  data: GeoJSON.FeatureCollection
}

/**
 * Strategy interface for loading territory data
 * Different atlas patterns require different loading strategies
 */
export interface TerritoryLoadStrategy {
  /**
   * Load territory data according to the pattern's requirements
   */
  loadTerritories: (service: GeoDataService) => Promise<TerritoryLoadResult>
}

/**
 * Loading strategy for single-focus atlases (France, Portugal, USA)
 * Loads primary territory separately from secondary territories
 */
export class SingleFocusLoadStrategy implements TerritoryLoadStrategy {
  async loadTerritories(service: GeoDataService): Promise<TerritoryLoadResult> {
    const [mainland, overseas] = await Promise.all([
      service.getMainLandData(),
      service.getOverseasData(),
    ])

    return {
      mainlandData: mainland,
      territories: overseas || [],
    }
  }
}

/**
 * Loading strategy for equal-members atlases (EU, World)
 * Loads all territories as equal individual territories
 */
export class EqualMembersLoadStrategy implements TerritoryLoadStrategy {
  async loadTerritories(service: GeoDataService): Promise<TerritoryLoadResult> {
    const allTerritoriesData = await service.getAllTerritories()

    // Transform to the format expected by the UI
    const territories = allTerritoriesData.map((territoryData: any) => ({
      name: territoryData.territory.name,
      code: territoryData.territory.code,
      area: territoryData.territory.area,
      region: territoryData.territory.region || 'Other',
      data: {
        type: 'FeatureCollection' as const,
        features: [territoryData.feature],
      },
    }))

    return {
      mainlandData: null,
      territories,
    }
  }
}

/**
 * Territory data loader with strategy pattern
 * Delegates loading logic to pattern-specific strategies
 */
export class TerritoryDataLoader {
  private strategy: TerritoryLoadStrategy

  constructor(pattern: string) {
    const patternService = AtlasPatternService.fromPattern(pattern as any)
    this.strategy = this.selectStrategy(patternService)
  }

  /**
   * Create loader from atlas pattern
   */
  static fromPattern(pattern: string): TerritoryDataLoader {
    return new TerritoryDataLoader(pattern)
  }

  /**
   * Load territory data using the appropriate strategy
   */
  async loadTerritories(service: GeoDataService): Promise<TerritoryLoadResult> {
    return this.strategy.loadTerritories(service)
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

  /**
   * Select the appropriate loading strategy based on atlas pattern
   */
  private selectStrategy(patternService: AtlasPatternService): TerritoryLoadStrategy {
    if (patternService.isSingleFocus()) {
      return new SingleFocusLoadStrategy()
    }
    else if (patternService.isEqualMembers()) {
      return new EqualMembersLoadStrategy()
    }
    else {
      // Default to equal members for unknown patterns
      debug('Unknown pattern, defaulting to equal-members strategy')
      return new EqualMembersLoadStrategy()
    }
  }
}
