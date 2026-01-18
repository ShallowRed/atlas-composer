import type { Territory } from '@/stores/geoData'
import type { TerritoryConfig } from '@/types'

import { getTerritoriesForMode } from '@/core/atlases/utils'

type GeoDataService = any

export interface TerritoryLoadResult {
  territories: Territory[]
}

export interface UnifiedDataLoadResult {
  data: GeoJSON.FeatureCollection
}

export class TerritoryDataLoader {
  static create(): TerritoryDataLoader {
    return new TerritoryDataLoader()
  }

  async loadTerritories(service: GeoDataService): Promise<TerritoryLoadResult> {
    const allTerritoriesData = await service.getAllTerritories()

    if (allTerritoriesData.length === 0) {
      return { territories: [] }
    }

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

    if (!options.hasTerritorySelector) {
      territoryCodes = undefined
    }
    else {
      let allTerritories: TerritoryConfig[]

      if (options.isWildcard) {
        const geoTerritories = await service.getAllTerritories()

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
