/**
 * Atlas Service
 * Atlas-aware facade for accessing territory data and configuration
 *
 * This service provides a clean API for working with a specific atlas's
 * territories, modes, groups, and projection parameters.
 */

import type { AtlasSpecificConfig, ProjectionParams } from '@/core/atlases/loader'
import type { AtlasConfig, CompositeProjectionConfig, TerritoryConfig, TerritoryGroupConfig, TerritoryModeConfig } from '@/types/territory'
import {
  getAllTerritories as getAtlasAllTerritories,
  getAtlasConfig,
  getOverseasTerritories as getAtlasOverseasTerritories,
  getAtlasSpecificConfig,
  getMainlandTerritory,
} from '@/core/atlases/registry'

import { getTerritoriesForMode, getTerritoryByCode, getTerritoryNameFromArray } from '@/core/atlases/utils'

export class AtlasService {
  private atlasId: string
  private atlasConfig: AtlasConfig
  private specificConfig: AtlasSpecificConfig

  constructor(atlasId: string) {
    this.atlasId = atlasId
    this.atlasConfig = getAtlasConfig(atlasId)
    this.specificConfig = getAtlasSpecificConfig(atlasId)
  }

  /**
   * Get atlas ID
   */
  getAtlasId(): string {
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
   * Get mainland territory (if applicable)
   */
  getMainland(): TerritoryConfig | undefined {
    return getMainlandTerritory(this.atlasId)
  }

  /**
   * Get overseas/remote territories
   */
  getOverseasTerritories(): TerritoryConfig[] {
    return getAtlasOverseasTerritories(this.atlasId)
  }

  /**
   * Get all territories (mainland + overseas)
   */
  getAllTerritories(): TerritoryConfig[] {
    return getAtlasAllTerritories(this.atlasId)
  }

  /**
   * Get territories for a specific mode
   */
  getTerritoriesForMode(mode: string): TerritoryConfig[] {
    const overseas = this.getOverseasTerritories()
    return getTerritoriesForMode(
      overseas,
      mode,
      this.specificConfig.territoryModes,
    )
  }

  /**
   * Get territory mode configurations
   */
  getTerritoryModes(): Record<string, TerritoryModeConfig> {
    return this.specificConfig.territoryModes
  }

  /**
   * Get territory groups
   */
  getTerritoryGroups(): Record<string, TerritoryGroupConfig> | undefined {
    return this.specificConfig.territoryGroups
  }

  /**
   * Get projection parameters
   */
  getProjectionParams(): ProjectionParams {
    return this.specificConfig.projectionParams
  }

  /**
   * Get composite projection configuration
   */
  getCompositeConfig(): CompositeProjectionConfig | undefined {
    return this.atlasConfig.compositeProjectionConfig
  }

  /**
   * Get default composite settings (projections, translations, scales)
   */
  getDefaultCompositeSettings() {
    return this.specificConfig.defaultCompositeConfig
  }

  /**
   * Get territory by code
   */
  getTerritoryByCode(code: string): TerritoryConfig | undefined {
    const all = this.getAllTerritories()
    return getTerritoryByCode(all, code)
  }

  /**
   * Get territory name
   */
  getTerritoryName(code: string): string {
    const all = this.getAllTerritories()
    return getTerritoryNameFromArray(all, code)
  }

  /**
   * Check if atlas has mainland/overseas split
   */
  hasMainlandOverseasSplit(): boolean {
    return !!this.getMainland()
  }

  /**
   * Check if atlas has territory selector
   */
  hasTerritorySelector(): boolean {
    return this.atlasConfig.hasTerritorySelector || false
  }
}
