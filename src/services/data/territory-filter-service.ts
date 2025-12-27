import type { Territory } from '@/stores/geoData'
import type { TerritoryConfig } from '@/types'
import type { TerritoryCode } from '@/types/branded'

import { getTerritoriesForMode } from '@/core/atlases/utils'

/**
 * Options for territory filtering
 */
export interface TerritoryFilterOptions {
  hasTerritorySelector: boolean
  territoryMode: string
  allTerritories: TerritoryConfig[]
  territoryModes: any[]
}

/**
 * Service for filtering territories based on atlas configuration and mode
 * Centralizes territory filtering logic that was previously in computed properties
 */
export class TerritoryFilterService {
  /**
   * Filter territories based on atlas configuration and current mode
   *
   * @param territories - All available territories
   * @param options - Filtering configuration
   * @returns Filtered list of territories
   */
  static filterTerritories(
    territories: Territory[],
    options: TerritoryFilterOptions,
  ): Territory[] {
    if (!territories || territories.length === 0) {
      return []
    }

    // If no territory modes defined, return all territories (no filtering available)
    if (!options.hasTerritorySelector) {
      return territories
    }

    // Get allowed territories for the current mode
    const allowedTerritories = getTerritoriesForMode(
      options.allTerritories,
      options.territoryMode,
      options.territoryModes,
    )
    const allowedCodes: TerritoryCode[] = allowedTerritories.map(t => t.code)

    // Filter territories based on mode
    return territories.filter(territory =>
      territory && territory.code && allowedCodes.includes(territory.code),
    )
  }

  /**
   * Group filtered territories by region
   *
   * @param territories - Filtered territories to group
   * @returns Map of region name to territories in that region
   */
  static groupByRegion(territories: Territory[]): Map<string, Territory[]> {
    const groups = new Map<string, Territory[]>()

    for (const territory of territories) {
      const region = territory.region || 'Other'
      if (!groups.has(region)) {
        groups.set(region, [])
      }
      groups.get(region)!.push(territory)
    }

    return groups
  }

  /**
   * Get territory codes from a list of territories
   *
   * @param territories - Territories to extract codes from
   * @returns Array of territory codes
   */
  static getTerritoryCodes(territories: TerritoryConfig[]): TerritoryCode[] {
    return territories.map(t => t.code as TerritoryCode)
  }

  /**
   * Check if a specific territory is allowed in the current mode
   *
   * @param territoryCode - Code of the territory to check
   * @param options - Filtering configuration
   * @returns True if territory is allowed, false otherwise
   */
  static isTerritoryAllowed(
    territoryCode: TerritoryCode,
    options: TerritoryFilterOptions,
  ): boolean {
    if (!options.hasTerritorySelector) {
      return true
    }

    const allowedTerritories = getTerritoriesForMode(
      options.allTerritories,
      options.territoryMode,
      options.territoryModes,
    )

    return allowedTerritories.some(t => t.code === territoryCode)
  }
}
