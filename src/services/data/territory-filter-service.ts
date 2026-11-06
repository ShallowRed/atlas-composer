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
}
