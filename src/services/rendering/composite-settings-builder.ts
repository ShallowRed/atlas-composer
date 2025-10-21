import type { CompositeProjectionConfig } from '@/types'

/**
 * Custom composite settings for rendering
 */
export interface CustomCompositeSettings {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
  // territoryScales removed - scale multipliers come from parameter store
}

/**
 * CompositeSettingsBuilder
 *
 * Builds custom composite settings from atlas configuration and user preferences
 * Always uses individual projections per territory
 */
export class CompositeSettingsBuilder {
  /**
   * Extract territory codes from composite projection configuration
   */
  static extractTerritoryCodes(compositeConfig: CompositeProjectionConfig | undefined): string[] {
    const territoryCodes: string[] = []

    if (!compositeConfig) {
      return territoryCodes
    }

    // Add primary/member code(s)
    if (compositeConfig.type === 'single-focus') {
      territoryCodes.push(compositeConfig.mainland.code)
    }
    else {
      compositeConfig.mainlands.forEach((m: any) => territoryCodes.push(m.code))
    }

    // Add all secondary territory codes
    compositeConfig.overseasTerritories.forEach((t: any) => territoryCodes.push(t.code))

    return territoryCodes
  }

  /**
   * Build territory projections map
   * Always uses individual territory projections
   */
  static buildTerritoryProjections(
    territoryProjections: Record<string, string>,
  ): Record<string, string> {
    // Always use individual territory projections
    return { ...territoryProjections }
  }

  /**
   * Build complete custom composite settings
   * Always uses individual territory projections
   */
  static buildSettings(
    _compositeConfig: CompositeProjectionConfig | undefined,
    territoryProjections: Record<string, string>,
    territoryTranslations: Record<string, { x: number, y: number }>,
    // territoryScales parameter removed - no longer needed
  ): CustomCompositeSettings {
    const projections = this.buildTerritoryProjections(territoryProjections)

    return {
      territoryProjections: projections,
      territoryTranslations,
      // territoryScales removed - handled by parameter store
    }
  }
}
