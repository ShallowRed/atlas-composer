/**
 * Region Service
 * Region-aware facade for accessing territory data and configuration
 *
 * This service provides a clean API for working with a specific region's
 * territories, modes, groups, and projection parameters.
 */

import type { CompositeProjectionConfig } from './CustomCompositeProjection'
import type { ProjectionParams, RegionSpecificConfig } from '@/config/regions/types'
import type { RegionConfig, TerritoryConfig, TerritoryGroupConfig, TerritoryModeConfig } from '@/types/territory'
import { getRegionConfig, REGION_SPECIFIC_CONFIGS } from '@/config/regions'
import {
  EU_COUNTRIES,
  FRANCE_ALL_TERRITORIES,
  FRANCE_OVERSEAS_TERRITORIES,
  MAINLAND_FRANCE,
  MAINLAND_PORTUGAL,
  PORTUGAL_ALL_TERRITORIES,
  PORTUGAL_AUTONOMOUS_REGIONS,
} from '@/data/territories'
import { TerritoryService } from './TerritoryService'

/**
 * Region-specific data registry
 */
const REGION_DATA_REGISTRY = {
  france: {
    mainland: MAINLAND_FRANCE,
    overseas: FRANCE_OVERSEAS_TERRITORIES,
    all: FRANCE_ALL_TERRITORIES,
  },
  portugal: {
    mainland: MAINLAND_PORTUGAL,
    overseas: PORTUGAL_AUTONOMOUS_REGIONS,
    all: PORTUGAL_ALL_TERRITORIES,
  },
  eu: {
    mainland: undefined,
    overseas: [],
    all: [],
  },
}

export class RegionService {
  private regionId: string
  private regionConfig: RegionConfig
  private specificConfig: RegionSpecificConfig

  constructor(regionId: string) {
    this.regionId = regionId
    this.regionConfig = getRegionConfig(regionId)
    this.specificConfig = (REGION_SPECIFIC_CONFIGS as any)[regionId] || REGION_SPECIFIC_CONFIGS.france!
  }

  /**
   * Get region ID
   */
  getRegionId(): string {
    return this.regionId
  }

  /**
   * Get region name
   */
  getRegionName(): string {
    return this.regionConfig.name
  }

  /**
   * Get full region configuration
   */
  getRegionConfig(): RegionConfig {
    return this.regionConfig
  }

  /**
   * Get mainland territory (if applicable)
   */
  getMainland(): TerritoryConfig | undefined {
    const data = REGION_DATA_REGISTRY[this.regionId as keyof typeof REGION_DATA_REGISTRY]
    return data?.mainland
  }

  /**
   * Get overseas/remote territories
   */
  getOverseasTerritories(): TerritoryConfig[] {
    const data = REGION_DATA_REGISTRY[this.regionId as keyof typeof REGION_DATA_REGISTRY]
    return data?.overseas || []
  }

  /**
   * Get all territories (mainland + overseas)
   */
  getAllTerritories(): TerritoryConfig[] {
    const data = REGION_DATA_REGISTRY[this.regionId as keyof typeof REGION_DATA_REGISTRY]
    return data?.all || []
  }

  /**
   * Get territories for a specific mode
   */
  getTerritoriesForMode(mode: string): TerritoryConfig[] {
    const overseas = this.getOverseasTerritories()
    return TerritoryService.getTerritoriesForMode(
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
    return this.regionConfig.compositeProjectionConfig
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
    return TerritoryService.getTerritoryByCode(all, code)
  }

  /**
   * Get territory name
   */
  getTerritoryName(code: string): string {
    const all = this.getAllTerritories()
    return TerritoryService.getTerritoryName(all, code)
  }

  /**
   * Get EU countries (for EU region only)
   */
  getEUCountries() {
    if (this.regionId === 'eu') {
      return EU_COUNTRIES
    }
    return []
  }

  /**
   * Check if region has mainland/overseas split
   */
  hasMainlandOverseasSplit(): boolean {
    return !!this.getMainland()
  }

  /**
   * Check if region has territory selector
   */
  hasTerritorySelector(): boolean {
    return this.regionConfig.hasTerritorySelector || false
  }
}
