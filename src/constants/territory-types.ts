/**
 * Generic territory configuration types and utilities
 * This file contains reusable types and functions for any geographic territory system
 */

/**
 * Configuration for a single territory
 */
export interface TerritoryConfig {
  code: string // Unique territory identifier (e.g., FR-GP, US-HI)
  name: string // Full display name
  shortName?: string // Optional abbreviated name
  center: [number, number] // Geographic center [longitude, latitude]
  offset: [number, number] // [x, y] pixel offset relative to mainland center for composite layouts
  bounds: [[number, number], [number, number]] // Geographic bounds [[minLon, minLat], [maxLon, maxLat]]
  projectionType?: string // Default projection type (mercator, conic-conformal, azimuthal, etc.)
  clipExtent?: { x1: number, y1: number, x2: number, y2: number } // Clip extent for composite projection layouts
  rotate?: [number, number, number?] // Optional rotation [lambda, phi, gamma] for the projection
  parallels?: [number, number] // Optional standard parallels for conic projections
}

/**
 * Configuration for the geographic data service
 * Defines how to load and process territory data
 */
export interface GeoDataConfig {
  dataPath: string // Path to the TopoJSON data file
  metadataPath: string // Path to the metadata JSON file
  topologyObjectName: string // Name of the TopoJSON object containing territories
  mainlandCode?: string // Optional code for the main/mainland territory (for regions with mainland/overseas split)
  mainlandBounds?: [[number, number], [number, number]] // Optional geographic bounds for mainland filtering
  overseasTerritories: TerritoryConfig[] // List of overseas/remote territories (empty for regions without split)
}

/**
 * Complete region configuration
 * Defines all settings for a geographic region (France, EU, etc.)
 */
export interface RegionConfig {
  id: string // Unique identifier (e.g., 'france', 'eu')
  name: string // Display name (e.g., 'France', 'European Union')
  geoDataConfig: GeoDataConfig // Data loading configuration
  supportedViewModes: Array<'split' | 'composite-existing' | 'composite-custom' | 'unified'> // Which view modes are available
  defaultViewMode: 'split' | 'composite-existing' | 'composite-custom' | 'unified' // Default view mode
  splitModeConfig?: {
    mainlandTitle?: string // Title for mainland section (e.g., 'France Métropolitaine')
    territoriesTitle: string // Title for territories section (e.g., 'États membres de l'Union Européenne', 'DOM-TOM')
  }
  territoryModeOptions?: Array<{ value: string, label: string }> // Options for "Territoires à inclure" selector (null if not applicable)
  hasTerritorySelector?: boolean // Whether to show the territory selector
}

/**
 * Territory mode definition
 * Defines which territories are included in a display mode
 */
export interface TerritoryModeConfig {
  label: string // Display label for the mode
  codes: string[] // Territory codes to include
}

/**
 * Territory grouping for UI organization
 */
export interface TerritoryGroupConfig {
  label: string // Display label for the group
  codes: string[] // Territory codes in this group
}

/**
 * Default projection types for different territory categories
 */
export const DEFAULT_PROJECTION_TYPES = {
  MAINLAND: 'conic-conformal',
  OVERSEAS: 'mercator',
  POLAR: 'azimuthal-equal-area',
} as const

/**
 * Default translation ranges for territory controls (in pixels)
 */
export const TRANSLATION_RANGES = {
  x: { min: -600, max: 600, step: 10 },
  y: { min: -400, max: 400, step: 10 },
} as const

/**
 * Default scale range for territory controls
 */
export const SCALE_RANGE = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  default: 1.0,
} as const

/**
 * Calculate proportional scale for a territory using D3's fitExtent logic
 *
 * This uses D3's actual projection fitting to ensure territories are sized
 * proportionally based on their geographic bounds, regardless of projection type.
 *
 * @param projection - A D3 geo projection instance
 * @param bounds - Geographic bounds [[minLon, minLat], [maxLon, maxLat]]
 * @param targetSize - Target pixel dimensions [width, height] (default: [500, 500])
 * @returns The calculated scale that would fit the bounds into targetSize
 */
export function calculateScaleFromBounds(
  projection: any, // D3 GeoProjection
  bounds: [[number, number], [number, number]],
  targetSize: [number, number] = [500, 500],
): number {
  // Create a GeoJSON box from bounds for fitting
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const boundingBox = {
    type: 'Polygon' as const,
    coordinates: [[
      [minLon, minLat],
      [maxLon, minLat],
      [maxLon, maxLat],
      [minLon, maxLat],
      [minLon, minLat],
    ]],
  }

  // Use D3's fitSize to calculate the proper scale
  const tempProjection = projection.fitSize
    ? projection.fitSize(targetSize, boundingBox)
    : projection

  // Extract and return the calculated scale
  return tempProjection.scale()
}

/**
 * Create a territory lookup map by code
 * @param territories - Array of territory configurations
 * @returns Map of territory code to configuration
 */
export function createTerritoryMap(territories: TerritoryConfig[]): Map<string, TerritoryConfig> {
  return new Map(territories.map(t => [t.code, t]))
}

/**
 * Get territory configuration by code from a map
 * @param territories - Territory map
 * @param code - Territory code
 * @returns Territory configuration or undefined
 */
export function getTerritoryConfig(
  territories: Map<string, TerritoryConfig>,
  code: string,
): TerritoryConfig | undefined {
  return territories.get(code)
}

/**
 * Get territory name by code
 * @param territories - Territory map
 * @param code - Territory code
 * @returns Territory name or the code if not found
 */
export function getTerritoryName(
  territories: Map<string, TerritoryConfig>,
  code: string,
): string {
  return territories.get(code)?.name || code
}

/**
 * Get territory short name (or full name if no short name)
 * @param territories - Territory map
 * @param code - Territory code
 * @returns Territory short name or full name or the code if not found
 */
export function getTerritoryShortName(
  territories: Map<string, TerritoryConfig>,
  code: string,
): string {
  const config = territories.get(code)
  return config?.shortName || config?.name || code
}

/**
 * Create default territory translations from configurations
 * @param territories - Array of territory configurations
 * @returns Record of territory code to translation coordinates
 */
export function createDefaultTranslations(
  territories: TerritoryConfig[],
): Record<string, { x: number, y: number }> {
  return Object.fromEntries(
    territories.map(t => [t.code, { x: t.offset[0], y: t.offset[1] }]),
  )
}

/**
 * Extract territory codes from configurations
 * @param territories - Array of territory configurations
 * @returns Array of territory codes
 */
export function extractTerritoryCodes(territories: TerritoryConfig[]): string[] {
  return territories.map(t => t.code)
}
