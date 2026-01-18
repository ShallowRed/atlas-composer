/**
 * Composite Atlas Layout Type Definitions
 *
 * Domain: Territory composition and arrangement
 * Scope: Frontend types for atlas layout configuration
 *
 * Note: For projection system metadata (D3 projections, capabilities, etc.),
 * see src/core/projections/types.d.ts
 */

import type { TerritoryConfig } from '@/types/territory'

export interface CompositeProjectionConfig {
  territories: TerritoryConfig[]
}

export interface CompositeProjectionDefaults {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>

  // territoryScales removed - scale multipliers now stored in parameter store
}

export type ViewMode = 'split' | 'built-in-composite' | 'composite-custom' | 'unified'
