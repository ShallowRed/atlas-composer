/**
 * Composite Atlas Layout Type Definitions
 *
 * Domain: Territory composition and arrangement
 * Scope: Frontend types for atlas layout configuration
 *
 * These types define how territories are arranged in composite atlases
 * (traditional 1+N, multi-mainland N+M patterns) and how they're displayed
 * (split, composite, unified view modes).
 *
 * Note: For projection system metadata (D3 projections, capabilities, etc.),
 * see src/core/projections/types.d.ts
 */

import type { TerritoryConfig } from '@/types/territory'

/**
 * Single-focus composite projection configuration
 *
 * Used for atlases with a single primary territory and multiple secondary territories
 * Examples: France (mainland + DROM), Portugal (continental + islands)
 *
 * Pattern: 1 primary + N secondary territories
 */
export interface SingleFocusCompositeConfig {
  type: 'single-focus'
  mainland: TerritoryConfig
  overseasTerritories: TerritoryConfig[]
}

/**
 * Equal-members composite projection configuration
 *
 * Used for atlases with multiple equal member territories
 * Examples: EU (member states), World (all countries), ASEAN (member states)
 *
 * Pattern: N equal members + optional secondary territories
 */
export interface EqualMembersCompositeConfig {
  type: 'equal-members'
  mainlands: TerritoryConfig[]
  overseasTerritories: TerritoryConfig[]
}

/**
 * Composite projection configuration
 *
 * Union type supporting both projection patterns:
 * - Single-focus: Single primary with secondary territories
 * - Equal-members: Multiple equal members with optional secondary
 */
export type CompositeProjectionConfig
  = | SingleFocusCompositeConfig
    | EqualMembersCompositeConfig

/**
 * Default composite projection settings
 *
 * Provides default values for custom composite projections,
 * allowing users to start with sensible defaults before customization.
 *
 * Part of the public AtlasConfig API.
 */
export interface CompositeProjectionDefaults {
  /** Default projection type for each territory (e.g., { 'FR-GP': 'mercator' }) */
  territoryProjections: Record<string, string>

  /** Default pixel translations for each territory (e.g., { 'FR-GP': { x: 100, y: -50 } }) */
  territoryTranslations: Record<string, { x: number, y: number }>

  // territoryScales removed - scale multipliers now stored in parameter store
}

/**
 * View mode types
 *
 * Defines how territories are displayed in the atlas:
 * - split: Separate views for mainland and overseas
 * - built-in-composite: Use pre-built D3 composite projection
 * - composite-custom: Custom positioning with user-defined layout
 * - unified: Single map with all territories in geographic positions
 */
export type ViewMode = 'split' | 'built-in-composite' | 'composite-custom' | 'unified'
