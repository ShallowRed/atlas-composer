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
  scale: number // Base scale for the projection (auto-calculated for proportional sizing)
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
  mainlandCode: string // Code for the main/mainland territory
  mainlandBounds: [[number, number], [number, number]] // Geographic bounds for mainland filtering
  overseasTerritories: TerritoryConfig[] // List of overseas/remote territories
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
 * Calculate proportional scale using D3's projection.fitSize() logic
 *
 * This approach mimics D3's fitSize() to calculate the exact scale for a standard
 * pixel box, ensuring all territories have proportional sizes regardless of projection type.
 *
 * Reference: a ~15° geographic span should fit in ~500px at scale 1.0
 *
 * @param bounds - Geographic bounds [[minLon, minLat], [maxLon, maxLat]]
 * @param projectionType - Type of projection to calculate scale for
 * @returns Calculated scale value
 */
export function calculateProportionalScale(
  bounds: [[number, number], [number, number]],
  projectionType: 'conic-conformal' | 'mercator' = 'mercator',
): number {
  // Use a mathematical approximation based on geographic extent
  // that mimics what D3's fitSize() does internally

  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const lonSpan = maxLon - minLon
  const latSpan = maxLat - minLat

  // Use maxSpan (like D3 fitSize does)
  const maxSpan = Math.max(lonSpan, latSpan)

  // Calculate scale based on projection type
  // These formulas are derived from empirical testing to match visual proportions

  if (projectionType === 'conic-conformal') {
    // For Conic Conformal projections (typically used for mid-latitude mainland regions):
    // 15° span → scale 2800
    // Formula: scale = 2800 * (15 / maxSpan) = 42000 / maxSpan
    return 42000 / maxSpan
  }
  else {
    // For Mercator projections (typically used for tropical/equatorial regions):
    // Need to account for projection difference
    // Target: produce similar pixel output relative to geographic size
    // Mercator at mid-latitudes (15-25°) needs ~50x smaller scale than Conic
    // to produce proportional output
    return (42000 / maxSpan) * 0.25
  }
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
