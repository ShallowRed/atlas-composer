/**
 * Territory Type Definitions
 *
 * Domain: Territory representation for rendering
 * Scope: Frontend runtime types for map territories
 *
 * These types represent territories in the application's runtime,
 * derived from JSON configs but enhanced for rendering purposes.
 */

import type { TerritoryCode } from './branded'

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
 * Represents a geographic territory with all necessary
 * information for rendering and positioning.
 */
export interface TerritoryConfig {
  /** Unique territory identifier (e.g., 'FR-GP', 'US-HI', 'PT-20') */
  code: TerritoryCode

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
 * Territory collection (unified replacement for modes and groups)
 *
 * Represents a collection of territories grouped by a specific strategy
 * Type is inferred from context (grouping strategy key)
 */
export interface TerritoryCollection {
  /** Unique identifier within the collection set */
  id: string

  /** Display label for this collection */
  label: string

  /** Territory codes in this collection. Use '*' for all territories. */
  codes: string[]

  /** Territory codes to exclude when using '*' */
  exclude?: string[]
}

/**
 * Territory collection set (replaces modes and groups arrays)
 *
 * Represents a grouping strategy with multiple collections
 * (e.g., 'geographic' strategy with Caribbean/Pacific/Atlantic collections)
 */
export interface TerritoryCollectionSet {
  /** Display label for the collection set */
  label: string

  /** Selection behavior: 'incremental' allows progressive additions, 'mutually-exclusive' allows only one collection at a time */
  selectionType: 'incremental' | 'mutually-exclusive'

  /** Optional description of the grouping strategy */
  description?: string

  /** Collections within this set */
  collections: TerritoryCollection[]
}

/**
 * Territory collections organized by strategy
 * Keys are user-defined collection set identifiers (e.g., 'geographic', 'administrative')
 */
export type TerritoryCollections = Record<string, TerritoryCollectionSet>
