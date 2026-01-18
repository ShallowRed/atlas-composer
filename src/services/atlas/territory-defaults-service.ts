import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryConfig } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'

export class TerritoryDefaultsService {
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

  static initializeProjections(
    territories: TerritoryConfig[],
    defaultProjection: ProjectionId = 'mercator' as ProjectionId,
  ): Record<TerritoryCode, ProjectionId> {
    return Object.fromEntries(
      territories.map(t => [t.code, defaultProjection]),
    ) as Record<TerritoryCode, ProjectionId>
  }

  static initializeTranslations(
    territories: TerritoryConfig[],
  ): Record<TerritoryCode, { x: number, y: number }> {
    return Object.fromEntries(
      territories.map(t => [t.code, { x: 0, y: 0 }]),
    ) as Record<TerritoryCode, { x: number, y: number }>
  }

  static initializeScales(
    territories: TerritoryConfig[],
  ): Record<TerritoryCode, number> {
    return Object.fromEntries(
      territories.map(t => [t.code, 1.0]),
    ) as Record<TerritoryCode, number>
  }
}
