import type { AtlasSpecificConfig } from '@/core/atlases/loader'
import type { AtlasId, TerritoryCollection, TerritoryConfig } from '@/types'
import {
  getAllTerritories as getAtlasAllTerritories,
  getAtlasSpecificConfig,
} from '@/core/atlases/registry'

export class AtlasService {
  private atlasId: AtlasId
  private specificConfig: AtlasSpecificConfig

  constructor(atlasId: AtlasId) {
    this.atlasId = atlasId
    this.specificConfig = getAtlasSpecificConfig(atlasId)
  }

  getAllTerritories(): TerritoryConfig[] {
    return getAtlasAllTerritories(this.atlasId)
  }

  getTerritoryModes(): Record<string, TerritoryCollection> {
    return this.specificConfig.territoryModes
  }
}
