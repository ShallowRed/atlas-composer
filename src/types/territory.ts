/**
 * Territory Type Definitions
 *
 * Domain: Territory representation for rendering
 * Scope: Frontend runtime types for map territories
 *
 * These types represent territories in the application's runtime,
 * derived from JSON configs but enhanced for rendering purposes.
 */

/**
 * Geographic coordinates [longitude, latitude]
 */
export type Coordinates = [number, number]

/**
 * Geographic bounding box [[minLon, minLat], [maxLon, maxLat]]
 */
export type BoundingBox = [Coordinates, Coordinates]

/**
 * Pixel offset [x, y] for positioning in composite layouts
 */
export type PixelOffset = [number, number]

/**
 * Projection rotation [lambda, phi, gamma?]
 */
export type ProjectionRotation = [number, number, number?]

/**
 * Standard parallels for conic projections [parallel1, parallel2]
 */
export type ConicParallels = [number, number]

/**
 * Configuration for a single territory
 *
 * Represents a geographic territory (mainland or overseas) with
 * all necessary information for rendering and positioning.
 */
export interface TerritoryConfig {
  /** Unique territory identifier (e.g., 'FR-GP', 'US-HI', 'PT-20') */
  code: string

  /** Full display name (e.g., 'Guadeloupe', 'Hawaii') */
  name: string

  /** Optional abbreviated name for compact displays */
  shortName?: string

  /** Geographic region for grouping (e.g., 'Caribbean', 'Pacific', 'Atlantic') */
  region?: string

  /** Geographic center [longitude, latitude] */
  center: Coordinates

  /** Geographic bounds [[minLon, minLat], [maxLon, maxLat]] */
  bounds: BoundingBox
}

/**
 * Territory mode definition
 *
 * Defines which territories should be included in a specific display mode
 * (e.g., "All territories", "Major territories only", "Mainland + Caribbean")
 */
export interface TerritoryModeConfig {
  /** Display label for the mode (e.g., "Métropole + majeurs") */
  label: string

  /** Territory codes to include in this mode. Can include "*" for wildcard (all territories) */
  codes: string[]

  /** Territory codes to exclude when using wildcard. Only used with wildcard modes. */
  exclude?: string[]
}

/**
 * Territory grouping for UI organization
 *
 * Groups territories by region or category for better UX
 * (e.g., "Caribbean", "Pacific", "Atlantic", "Indian Ocean")
 */
export interface TerritoryGroupConfig {
  /** Display label for the group */
  label: string

  /** Territory codes in this group */
  codes: string[]
}
