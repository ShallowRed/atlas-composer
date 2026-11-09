import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryConfig, Translation } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'

export class TerritoryDefaultsService {
  static initializeAll(
    territories: TerritoryConfig[],
    defaultProjection: ProjectionId = FALLBACK_PROJECTION_ID,
  ): TerritoryDefaults {
    return {
      projections: this.initializeProjections(territories, defaultProjection),
      translations: this.initializeTranslations(territories),
      scales: this.initializeScales(territories),
    }
  }

  static initializeProjections(
    territories: TerritoryConfig[],
    defaultProjection: ProjectionId = FALLBACK_PROJECTION_ID,
  ): Record<TerritoryCode, ProjectionId> {
    return Object.fromEntries(
      territories.map(t => [t.code, defaultProjection]),
    ) as Record<TerritoryCode, ProjectionId>
  }

  static initializeTranslations(
    territories: TerritoryConfig[],
  ): Record<TerritoryCode, Translation> {
    return Object.fromEntries(
      territories.map(t => [t.code, { x: 0, y: 0 }]),
    ) as Record<TerritoryCode, Translation>
  }

  static initializeScales(
    territories: TerritoryConfig[],
  ): Record<TerritoryCode, number> {
    return Object.fromEntries(
      territories.map(t => [t.code, 1.0]),
    ) as Record<TerritoryCode, number>
  }
}
