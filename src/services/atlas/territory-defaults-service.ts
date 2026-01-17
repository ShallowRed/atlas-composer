import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryConfig } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'

/**
 * Service for initializing territory default configurations
 * Provides empty defaults - all actual values should come from presets
 */
export class TerritoryDefaultsService {
  /**
   * Returns empty maps - values must come from presets
   *
   * @param territories - All territories for the atlas
   * @param defaultProjection - Default projection to use (default: 'mercator')
   * @returns Complete set of empty territory defaults
   */
  static initializeAll(
    territories: TerritoryConfig[],
    defaultProjection: ProjectionId = 'mercator' as ProjectionId,
  ): TerritoryDefaults {
    return {
      projections: this.initializeProjections(territories, defaultProjection),
      translations: this.initializeTranslations(territories),
      scales: this.initializeScales(territories),
    }
  }

  /**
   *
   * @param territories - Territories to initialize
   * @param defaultProjection - Default projection to use
   * @returns Map of territory code to projection ID (all set to default)
   */
  static initializeProjections(
    territories: TerritoryConfig[],
    defaultProjection: ProjectionId = 'mercator' as ProjectionId,
  ): Record<TerritoryCode, ProjectionId> {
    return Object.fromEntries(
      territories.map(t => [t.code, defaultProjection]),
    ) as Record<TerritoryCode, ProjectionId>
  }

  /**
   * Actual offsets must come from presets
   *
   * @param territories - Territories to initialize
   * @returns Map of territory code to zero translation offset
   */
  static initializeTranslations(
    territories: TerritoryConfig[],
  ): Record<TerritoryCode, { x: number, y: number }> {
    return Object.fromEntries(
      territories.map(t => [t.code, { x: 0, y: 0 }]),
    ) as Record<TerritoryCode, { x: number, y: number }>
  }

  /**
   * Actual scale multipliers must come from presets
   *
   * @param territories - Territories to initialize
   * @returns Map of territory code to scale multiplier (all set to 1.0)
   */
  static initializeScales(
    territories: TerritoryConfig[],
  ): Record<TerritoryCode, number> {
    return Object.fromEntries(
      territories.map(t => [t.code, 1.0]),
    ) as Record<TerritoryCode, number>
  }
}
