/**
 * Composite Atlas Layout Type Definitions
 *
 * Domain: Territory composition and arrangement
 * Scope: Frontend types for atlas layout configuration
 *
 * Note: For projection system metadata (D3 projections, capabilities, etc.),
 * see src/core/projections/types.d.ts
 */

import type { PresetType } from '#types'
import type { TerritoryConfig } from '@/types/territory'

export interface CompositeTerritories {
  territories: TerritoryConfig[]
}

export type ViewMode = PresetType
