/**
 * Territory Service
 * Generic utility functions for working with territory data
 *
 * This service provides region-agnostic operations on territories.
 * It does NOT contain region-specific logic.
 */

import type { TerritoryConfig, TerritoryModeConfig } from '@/types/territory'

export class TerritoryService {
  /**
   * Get a territory by its code
   */
  static getTerritoryByCode(
    territories: TerritoryConfig[],
    code: string,
  ): TerritoryConfig | undefined {
    return territories.find(t => t.code === code)
  }

  /**
   * Get territories by region
   */
  static getTerritoriesByRegion(
    territories: TerritoryConfig[],
    region: string,
  ): TerritoryConfig[] {
    return territories.filter(t => t.region === region)
  }

  /**
   * Get territories for a specific mode
   * Uses the mode configuration to filter territories
   */
  static getTerritoriesForMode(
    territories: TerritoryConfig[],
    mode: string,
    modeConfig: Record<string, TerritoryModeConfig>,
  ): TerritoryConfig[] {
    const modeDefinition = modeConfig[mode]
    if (!modeDefinition) {
      return []
    }

    // If no codes specified, return empty (mode shows only mainland)
    if (modeDefinition.codes.length === 0) {
      return []
    }

    // Return territories matching the codes in this mode
    const codesSet = new Set(modeDefinition.codes)
    return territories.filter(t => codesSet.has(t.code))
  }

  /**
   * Calculate default translations from territory offsets
   */
  static calculateDefaultTranslations(
    territories: TerritoryConfig[],
  ): Record<string, { x: number, y: number }> {
    return Object.fromEntries(
      territories.map(t => [t.code, { x: t.offset[0], y: t.offset[1] }]),
    )
  }

  /**
   * Calculate default scales (all set to 1.0)
   */
  static calculateDefaultScales(
    territories: TerritoryConfig[],
  ): Record<string, number> {
    return Object.fromEntries(
      territories.map(t => [t.code, 1.0]),
    )
  }

  /**
   * Calculate default projections from territory projection types
   */
  static calculateDefaultProjections(
    territories: TerritoryConfig[],
    fallback: string = 'mercator',
  ): Record<string, string> {
    return Object.fromEntries(
      territories.map(t => [t.code, t.projectionType || fallback]),
    )
  }

  /**
   * Extract territory codes
   */
  static extractTerritoryCodes(territories: TerritoryConfig[]): string[] {
    return territories.map(t => t.code)
  }

  /**
   * Get territory name
   */
  static getTerritoryName(
    territories: TerritoryConfig[],
    code: string,
  ): string {
    const territory = territories.find(t => t.code === code)
    return territory?.name || code
  }

  /**
   * Get territory short name (or full name if no short name)
   */
  static getTerritoryShortName(
    territories: TerritoryConfig[],
    code: string,
  ): string {
    const territory = territories.find(t => t.code === code)
    return territory?.shortName || territory?.name || code
  }

  /**
   * Group territories by region
   */
  static groupByRegion(
    territories: TerritoryConfig[],
  ): Record<string, TerritoryConfig[]> {
    const groups: Record<string, TerritoryConfig[]> = {}

    for (const territory of territories) {
      const region = territory.region || 'Other'
      if (!groups[region]) {
        groups[region] = []
      }
      groups[region]!.push(territory)
    }

    return groups
  }

  /**
   * Get unique regions from territories
   */
  static getUniqueRegions(territories: TerritoryConfig[]): string[] {
    const regions = new Set<string>()
    for (const territory of territories) {
      if (territory.region) {
        regions.add(territory.region)
      }
    }
    return Array.from(regions).sort()
  }
}
