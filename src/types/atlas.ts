/**
 * Atlas Configuration Type Definitions
 *
 * Domain: Complete atlas configuration
 * Scope: Frontend types for atlas setup and initialization
 *
 * These types define the complete configuration for a geographic atlas
 * (France, Portugal, EU, etc.), including data sources, view modes,
 * projection settings, and UI configuration.
 */

import type { CompositeProjectionConfig, CompositeProjectionDefaults, ViewMode } from '@/types/composite'
import type { GeoDataConfig } from '@/types/geo-data'

/**
 * Split mode configuration
 *
 * Defines labels and codes for split view mode where
 * mainland and overseas territories are shown separately.
 */
export interface SplitModeConfig {
  /** Title for mainland section (e.g., 'France Métropolitaine', 'Continental Portugal') */
  mainlandTitle?: string

  /** Code for mainland in territory controls (e.g., 'FR-MET', 'PT-CONT') */
  mainlandCode?: string

  /** Title for territories section (e.g., 'Territoires ultramarins', 'Regiões autónomas') */
  territoriesTitle: string
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
 * Complete atlas configuration
 *
 * Central configuration object that defines all settings for a
 * geographic atlas (France, Portugal, EU, etc.).
 *
 * This is the main interface used throughout the application
 * to configure map rendering, data loading, and UI behavior.
 */
export interface AtlasConfig {
  /** Unique identifier (e.g., 'france', 'portugal', 'eu') */
  id: string

  /** Display name (e.g., 'France', 'Portugal', 'European Union') */
  name: string

  /** Data loading configuration */
  geoDataConfig: GeoDataConfig

  /** Supported view modes for this atlas */
  supportedViewModes: ViewMode[]

  /** Default view mode on initialization */
  defaultViewMode: ViewMode

  /** Configuration for split view mode */
  splitModeConfig?: SplitModeConfig

  /** Options for territory mode selector */
  territoryModeOptions?: TerritoryModeOption[]

  /** Default territory mode (e.g., 'all-territories', 'metropole-only') */
  defaultTerritoryMode?: string

  /** Default configuration for composite-custom mode */
  defaultCompositeConfig?: CompositeProjectionDefaults

  /**
   * Built-in D3 composite projections available for this atlas
   * Examples: ['conic-conformal-france', 'conic-conformal-portugal']
   */
  compositeProjections?: string[]

  /** Default composite projection to use for composite-existing mode */
  defaultCompositeProjection?: string

  /** Configuration for CompositeProjection class (mainland/overseas structure) */
  compositeProjectionConfig?: CompositeProjectionConfig

  /** Whether to show the territory selector in the UI */
  hasTerritorySelector?: boolean

  /**
   * Atlas pattern type - defines structural relationship between territories
   * - 'single-focus': Single primary territory + N secondary territories (France, Portugal, USA)
   * - 'equal-members': N equal member territories + optional secondary (EU, World, ASEAN)
   * - 'hierarchical': Hierarchical parent-child structure (future: USA states, China provinces)
   */
  pattern: 'single-focus' | 'equal-members' | 'hierarchical'

  /**
   * Whether territories are loaded dynamically from data file (wildcard atlas)
   * True for atlases with territories: "*" in config
   */
  isWildcard?: boolean
}
