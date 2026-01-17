/**
 * Atlas Configuration Type Definitions
 *
 * Domain: Complete atlas configuration
 * Scope: Frontend types for atlas setup and initialization
 *
 * These types define the complete configuration for a geographic atlas
 * (France, Portugal, EU, etc.), including data sources,
 * projection settings, and UI configuration.
 */

import type { CompositeProjectionConfig } from '@/types/composite'
import type { GeoDataConfig } from '@/types/geo-data'

/**
 * Split mode configuration
 *
 * Defines labels and codes for split view mode where
 * the primary territory and other territories are shown separately.
 */
export interface SplitModeConfig {
  /** Title for primary territory section (e.g., 'France Métropolitaine', 'Continental Portugal') */
  primaryTitle?: string

  /** Code for primary territory (e.g., 'FR-MET', 'PT-CONT') */
  primaryTerritoryCode?: string

  /** Title for other territories section (e.g., 'Territoires ultramarins', 'Regiões autónomas') */
  otherTerritoriesTitle: string
}

/**
 * Territory mode option for selector
 *
 * UI option for "Territoires à inclure" dropdown selector
 */
export interface TerritoryModeOption {
  /** Internal value/ID (e.g., 'all-territories', 'metropole-only') */
  value: string

  /** Display label (e.g., 'Tous les territoires', 'Territoires majeurs') */
  label: string
}

/**
 * Atlas category for UI grouping
 */
export type AtlasCategory = 'country' | 'region' | 'world'

/**
 * Complete atlas configuration
 *
 * Central configuration object that defines all settings for a
 * geographic atlas (France, Portugal, EU, etc.).
 *
 * This is the main interface used throughout the application
 * to configure map rendering, data loading, and UI behavior.
 */
export interface AtlasConfig {
  /** Unique identifier (e.g., 'france', 'portugal', 'europe') */
  id: string

  /** Display name (e.g., 'France', 'Portugal', 'European Union') */
  name: string

  /** Category for UI grouping (country, region, world). Defaults to 'country' if not specified. */
  category?: AtlasCategory

  /** Data loading configuration */
  geoDataConfig: GeoDataConfig

  /** Configuration for split view mode */
  splitModeConfig?: SplitModeConfig

  /** Options for territory mode selector */
  territoryModeOptions?: TerritoryModeOption[]

  /** Default preset to load for composite-custom mode (e.g., 'france-default') */
  defaultPreset?: string

  /** Configuration for CompositeProjection class (mainland/overseas structure) */
  compositeProjectionConfig?: CompositeProjectionConfig

  /** Whether to show the territory selector in the UI */
  hasTerritorySelector?: boolean

  /**
   * Whether territories are loaded dynamically from data file (wildcard atlas)
   * True for atlases with territories: "*" in config
   */
  isWildcard?: boolean
}
