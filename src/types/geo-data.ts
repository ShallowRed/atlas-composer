/**
 * Geographic Data Type Definitions
 *
 * Domain: Geographic data loading and processing
 * Scope: Frontend types for data service configuration
 *
 * These types define how geographic data (TopoJSON, GeoJSON) is
 * loaded, processed, and prepared for rendering.
 */

import type { BoundingBox, TerritoryConfig } from '@/types/territory'

/**
 * Configuration for the geographic data service
 *
 * Defines paths and parameters for loading territory geodata.
 * Used by GeoDataService to fetch and process TopoJSON files.
 */
export interface GeoDataConfig {
  /** Path to the TopoJSON data file (e.g., '/data/france-territories-50m.json') */
  dataPath: string

  /** Path to the metadata JSON file (e.g., '/data/france-metadata-50m.json') */
  metadataPath: string

  /** Name of the TopoJSON object containing territories (typically 'territories') */
  topologyObjectName: string

  /**
   * Optional code for the main/mainland territory
   * Used for regions with mainland/overseas split (e.g., 'FR-MET', 'PT-CONT')
   * Undefined for multi-mainland atlases where all territories are equal
   */
  mainlandCode?: string

  /**
   * Optional geographic bounds for mainland filtering
   * Used to separate mainland from overseas territories
   */
  mainlandBounds?: BoundingBox

  /**
   * List of overseas/remote territories
   * Empty array for regions without overseas territories
   */
  overseasTerritories: TerritoryConfig[]

  /**
   * Flag indicating wildcard territory loading (all territories from data file)
   * When true, all features in the data file are loaded dynamically
   */
  isWildcard?: boolean
}
