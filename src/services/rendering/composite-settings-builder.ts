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
 * Handles both uniform and individual projection modes
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
   * Build territory projections map based on projection mode
   */
  static buildTerritoryProjections(
    territoryCodes: string[],
    projectionMode: 'uniform' | 'individual',
    selectedProjection: string,
    territoryProjections: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = {}

    if (projectionMode === 'individual') {
      // Use individual territory projections
      Object.assign(result, territoryProjections)
    }
    else {
      // Uniform mode: all territories use the same projection
      territoryCodes.forEach((code) => {
        result[code] = selectedProjection
      })
    }

    return result
  }

  /**
   * Build complete custom composite settings
   */
  static buildSettings(
    compositeConfig: CompositeProjectionConfig | undefined,
    projectionMode: 'uniform' | 'individual',
    selectedProjection: string,
    territoryProjections: Record<string, string>,
    territoryTranslations: Record<string, { x: number, y: number }>,
    // territoryScales parameter removed - no longer needed
  ): CustomCompositeSettings {
    const territoryCodes = this.extractTerritoryCodes(compositeConfig)

    const projections = this.buildTerritoryProjections(
      territoryCodes,
      projectionMode,
      selectedProjection,
      territoryProjections,
    )

    return {
      territoryProjections: projections,
      territoryTranslations,
      // territoryScales removed - handled by parameter store
    }
  }
}
