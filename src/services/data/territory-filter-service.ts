import type { Territory } from '@/stores/geoData'
import type { TerritoryConfig } from '@/types'
import type { TerritoryCode } from '@/types/branded'

import { getTerritoriesForMode } from '@/core/atlases/utils'

export interface TerritoryFilterOptions {
  hasTerritorySelector: boolean
  territoryMode: string
  allTerritories: TerritoryConfig[]
  territoryModes: any[]
}

export class TerritoryFilterService {
  static filterTerritories(
    territories: Territory[],
    options: TerritoryFilterOptions,
  ): Territory[] {
    if (!territories || territories.length === 0) {
      return []
    }

    if (!options.hasTerritorySelector) {
      return territories
    }

    const allowedTerritories = getTerritoriesForMode(
      options.allTerritories,
      options.territoryMode,
      options.territoryModes,
    )
    const allowedCodes: TerritoryCode[] = allowedTerritories.map(t => t.code)

    return territories.filter(territory =>
      territory && territory.code && allowedCodes.includes(territory.code),
    )
  }

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

  static getTerritoryCodes(territories: TerritoryConfig[]): TerritoryCode[] {
    return territories.map(t => t.code as TerritoryCode)
  }

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
