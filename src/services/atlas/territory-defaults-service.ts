import type { ClipExtent, TerritoryConfig } from '@/types'

import { calculateDefaultProjections, calculateDefaultScales, createDefaultTranslations } from '@/core/atlases/utils'

/**
 * Territory defaults result containing all initialization data
 */
export interface TerritoryDefaults {
  projections: Record<string, string>
  translations: Record<string, { x: number, y: number }>
  scales: Record<string, number>
  clipExtents?: Record<string, ClipExtent | null>
}

/**
 * Service for initializing territory default configurations
 * Centralizes initialization logic for projections, translations, and scales
 */
export class TerritoryDefaultsService {
  /**
   * Initialize all territory defaults at once
   *
   * @param territories - All territories for the atlas
   * @param defaultProjection - Default projection to use (default: 'mercator')
   * @returns Complete set of territory defaults
   */
  static initializeAll(
    territories: TerritoryConfig[],
    defaultProjection: string = 'mercator',
  ): TerritoryDefaults {
    return {
      projections: this.initializeProjections(territories, defaultProjection),
      translations: this.initializeTranslations(territories),
      scales: this.initializeScales(territories),
    }
  }

  /**
   * Initialize territory projections
   *
   * @param territories - Territories to initialize
   * @param defaultProjection - Default projection to use
   * @returns Map of territory code to projection ID
   */
  static initializeProjections(
    territories: TerritoryConfig[],
    defaultProjection: string = 'mercator',
  ): Record<string, string> {
    return calculateDefaultProjections(territories, defaultProjection)
  }

  /**
   * Initialize territory translations (x, y offsets in pixels)
   * Positive X = right, Negative X = left
   * Positive Y = down, Negative Y = up
   *
   * @param territories - Territories to initialize
   * @returns Map of territory code to translation offset
   */
  static initializeTranslations(
    territories: TerritoryConfig[],
  ): Record<string, { x: number, y: number }> {
    return createDefaultTranslations(territories)
  }

  /**
   * Initialize territory scales (scale multipliers for territory sizing)
   * All territories start with default 1.0 multiplier
   *
   * @param territories - Territories to initialize
   * @returns Map of territory code to scale multiplier
   */
  static initializeScales(
    territories: TerritoryConfig[],
  ): Record<string, number> {
    return calculateDefaultScales(territories)
  }
}
