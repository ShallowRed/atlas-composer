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
 * Traditional composite projection configuration
 *
 * Used for atlases with a single mainland and multiple overseas territories
 * Examples: France (mainland + DROM), Portugal (continental + islands)
 *
 * Pattern: 1 mainland + N overseas territories
 */
export interface TraditionalCompositeConfig {
  type: 'traditional'
  mainland: TerritoryConfig
  overseasTerritories: TerritoryConfig[]
}

/**
 * Multi-mainland composite projection configuration
 *
 * Used for atlases with multiple equal mainland territories
 * Examples: EU (member states), Malaysia (states), USA (states)
 *
 * Pattern: N mainlands + M overseas territories
 */
export interface MultiMainlandCompositeConfig {
  type: 'multi-mainland'
  mainlands: TerritoryConfig[]
  overseasTerritories: TerritoryConfig[]
}

/**
 * Composite projection configuration
 *
 * Union type supporting both projection patterns:
 * - Traditional: Single mainland with overseas territories
 * - Multi-mainland: Multiple equal mainlands with optional overseas
 */
export type CompositeProjectionConfig
  = | TraditionalCompositeConfig
    | MultiMainlandCompositeConfig

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

  /** Default scale multipliers for each territory (e.g., { 'FR-GP': 1.2 }) */
  territoryScales: Record<string, number>
}

/**
 * View mode types
 *
 * Defines how territories are displayed in the atlas:
 * - split: Separate views for mainland and overseas
 * - composite-existing: Use pre-built D3 composite projection
 * - composite-custom: Custom positioning with user-defined layout
 * - unified: Single map with all territories in geographic positions
 */
export type ViewMode = 'split' | 'composite-existing' | 'composite-custom' | 'unified'
