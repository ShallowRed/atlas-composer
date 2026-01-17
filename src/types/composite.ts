/**
 * Composite Atlas Layout Type Definitions
 *
 * Domain: Territory composition and arrangement
 * Scope: Frontend types for atlas layout configuration
 *
 * These types define how territories are arranged in composite atlases
 * and how they're displayed (split, composite, unified view modes).
 *
 * Note: For projection system metadata (D3 projections, capabilities, etc.),
 * see src/core/projections/types.d.ts
 */

import type { TerritoryConfig } from '@/types/territory'

/**
 * Composite projection configuration
 *
 * Used for atlases with multiple territories displayed in a composite layout.
 * All territories are treated equally - no hierarchy or role distinction.
 */
export interface CompositeProjectionConfig {
  /** All territories in the composite */
  territories: TerritoryConfig[]
}

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
