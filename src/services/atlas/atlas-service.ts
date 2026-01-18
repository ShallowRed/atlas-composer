import type { AtlasSpecificConfig } from '@/core/atlases/loader'
import type { AtlasConfig, AtlasId, CompositeProjectionConfig, TerritoryCode, TerritoryCollection, TerritoryCollections, TerritoryConfig } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import type { AtlasRegistryBehavior } from '@/types/registry'
import {
  getAllTerritories as getAtlasAllTerritories,
  getAtlasBehavior,
  getAtlasConfig,
  getAtlasSpecificConfig,
  getFirstTerritory,
} from '@/core/atlases/registry'

import { getTerritoriesForMode, getTerritoryByCode, getTerritoryNameFromArray } from '@/core/atlases/utils'

export class AtlasService {
  private atlasId: AtlasId
  private atlasConfig: AtlasConfig
  private specificConfig: AtlasSpecificConfig

  constructor(atlasId: AtlasId) {
    this.atlasId = atlasId
    this.atlasConfig = getAtlasConfig(atlasId)
    this.specificConfig = getAtlasSpecificConfig(atlasId)
  }

  getAtlasId(): AtlasId {
    return this.atlasId
  }

  getAtlasName(): string {
    return this.atlasConfig.name
  }

  getAtlasConfig(): AtlasConfig {
    return this.atlasConfig
  }

  getFirstTerritory(): TerritoryConfig {
    return getFirstTerritory(this.atlasId)
  }

  getAllTerritories(): TerritoryConfig[] {
    return getAtlasAllTerritories(this.atlasId)
  }

  getTerritoriesForMode(mode: string): TerritoryConfig[] {
    const allTerritories = this.getAllTerritories()
    return getTerritoriesForMode(
      allTerritories,
      mode,
      this.specificConfig.territoryModes,
    )
  }

  getTerritoryModes(): Record<string, TerritoryCollection> {
    return this.specificConfig.territoryModes
  }

  getTerritoryCollections(): TerritoryCollections | undefined {
    return this.specificConfig.territoryCollections
  }

  getRegistryBehavior(): AtlasRegistryBehavior | undefined {
    return getAtlasBehavior(this.atlasId)
  }

  getProjectionParams(): ProjectionParameters {
    return this.specificConfig.projectionParams
  }

  getCompositeConfig(): CompositeProjectionConfig | undefined {
    return this.atlasConfig.compositeProjectionConfig
  }

  getTerritoryByCode(code: TerritoryCode): TerritoryConfig | undefined {
    const all = this.getAllTerritories()
    return getTerritoryByCode(all, code)
  }

  getTerritoryName(code: TerritoryCode): string {
    const all = this.getAllTerritories()
    return getTerritoryNameFromArray(all, code)
  }

  hasTerritorySelector(): boolean {
    return this.atlasConfig.hasTerritorySelector || false
  }
}
