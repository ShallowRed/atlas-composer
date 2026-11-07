import type { CompositeProjectionConfig, Translation } from '@/types'

export interface CustomCompositeSettings {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, Translation>
}

export class CompositeSettingsBuilder {
  static buildTerritoryProjections(
    territoryProjections: Record<string, string>,
  ): Record<string, string> {
    return { ...territoryProjections }
  }

  static buildSettings(
    _compositeConfig: CompositeProjectionConfig | undefined,
    territoryProjections: Record<string, string>,
    territoryTranslations: Record<string, Translation>,
  ): CustomCompositeSettings {
    const projections = this.buildTerritoryProjections(territoryProjections)

    return {
      territoryProjections: projections,
      territoryTranslations,
    }
  }
}
