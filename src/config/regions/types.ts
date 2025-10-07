/**
 * Region Configuration Types
 * Type definitions for region-specific configuration
 */

import type { TerritoryGroupConfig, TerritoryModeConfig } from '@/types/territory'

/**
 * Projection parameters for a region
 * Used to configure projections with region-specific settings
 */
export interface ProjectionParams {
  center: {
    longitude: number
    latitude: number
  }
  rotate: {
    mainland: [number, number]
    azimuthal: [number, number]
  }
  parallels: {
    conic: [number, number]
  }
}

/**
 * Default composite projection settings
 * Pre-configured projection, translation, and scale values
 */
export interface CompositeProjectionDefaults {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
  territoryScales: Record<string, number>
}

/**
 * Region-specific configuration
 * All settings needed for a geographic region
 */
export interface RegionSpecificConfig {
  projectionParams: ProjectionParams
  territoryModes: Record<string, TerritoryModeConfig>
  territoryGroups?: Record<string, TerritoryGroupConfig>
  defaultCompositeConfig?: CompositeProjectionDefaults
}
