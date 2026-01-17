/**
 * Atlas Service
 * Atlas-aware facade for accessing territory data and configuration
 *
 * This service provides a clean API for working with a specific atlas's
 * territories, modes, groups, and projection parameters.
 */

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

  /**
   * Get atlas ID
   */
  getAtlasId(): AtlasId {
    return this.atlasId
  }

  /**
   * Get atlas name
   */
  getAtlasName(): string {
    return this.atlasConfig.name
  }

  /**
   * Get full region configuration
   */
  getAtlasConfig(): AtlasConfig {
    return this.atlasConfig
  }

  /**
   * Get first/primary territory (for split view)
   */
  getFirstTerritory(): TerritoryConfig {
    return getFirstTerritory(this.atlasId)
  }

  /**
   * Get all territories
   */
  getAllTerritories(): TerritoryConfig[] {
    return getAtlasAllTerritories(this.atlasId)
  }

  /**
   * Get territories for a specific mode
   */
  getTerritoriesForMode(mode: string): TerritoryConfig[] {
    const allTerritories = this.getAllTerritories()
    return getTerritoriesForMode(
      allTerritories,
      mode,
      this.specificConfig.territoryModes,
    )
  }

  /**
   * Get territory mode configurations
   */
  getTerritoryModes(): Record<string, TerritoryCollection> {
    return this.specificConfig.territoryModes
  }

  /**
   * Get territory collections (unified approach)
   * Returns the new territoryCollections if available, undefined otherwise
   */
  getTerritoryCollections(): TerritoryCollections | undefined {
    return this.specificConfig.territoryCollections
  }

  /**
   * Get registry behavior configuration for this atlas
   * Returns behavior config (presets, UI settings) from registry
   */
  getRegistryBehavior(): AtlasRegistryBehavior | undefined {
    return getAtlasBehavior(this.atlasId)
  }

  /**
   * Get projection parameters
   */
  getProjectionParams(): ProjectionParameters {
    return this.specificConfig.projectionParams
  }

  /**
   * Get composite projection configuration
   */
  getCompositeConfig(): CompositeProjectionConfig | undefined {
    return this.atlasConfig.compositeProjectionConfig
  }

  /**
   * Get territory by code
   */
  getTerritoryByCode(code: TerritoryCode): TerritoryConfig | undefined {
    const all = this.getAllTerritories()
    return getTerritoryByCode(all, code)
  }

  /**
   * Get territory name
   */
  getTerritoryName(code: TerritoryCode): string {
    const all = this.getAllTerritories()
    return getTerritoryNameFromArray(all, code)
  }

  /**
   * Check if atlas has territory selector
   */
  hasTerritorySelector(): boolean {
    return this.atlasConfig.hasTerritorySelector || false
  }
}
