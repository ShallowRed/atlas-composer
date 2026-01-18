import type { CompositeProjectionConfig } from '@/types'

export interface CustomCompositeSettings {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
}

export class CompositeSettingsBuilder {
  static extractTerritoryCodes(compositeConfig: CompositeProjectionConfig | undefined): string[] {
    if (!compositeConfig) {
      return []
    }

    return compositeConfig.territories.map(t => t.code)
  }

  static buildTerritoryProjections(
    territoryProjections: Record<string, string>,
  ): Record<string, string> {
    return { ...territoryProjections }
  }

  static buildSettings(
    _compositeConfig: CompositeProjectionConfig | undefined,
    territoryProjections: Record<string, string>,
    territoryTranslations: Record<string, { x: number, y: number }>,
  ): CustomCompositeSettings {
    const projections = this.buildTerritoryProjections(territoryProjections)

    return {
      territoryProjections: projections,
      territoryTranslations,
    }
  }
}
