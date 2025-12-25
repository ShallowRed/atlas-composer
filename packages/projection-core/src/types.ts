/**
 * Projection Core Types
 *
 * Shared type definitions for composite projection building.
 * These types are D3-compatible but don't require d3-geo as a dependency.
 */

/**
 * Stream protocol interface for D3 geographic transforms
 *
 * D3's geographic projections use a streaming API where geometry flows
 * through a pipeline of transforms. This interface defines the standard
 * stream methods that projections and path generators use.
 */
export interface StreamLike {
  /** Process a point at coordinates (x, y) */
  point: (x: number, y: number) => void
  /** Begin a new line string */
  lineStart: () => void
  /** End the current line string */
  lineEnd: () => void
  /** Begin a new polygon */
  polygonStart: () => void
  /** End the current polygon */
  polygonEnd: () => void
  /** Process a sphere (for graticules and globe rendering) */
  sphere?: () => void
}

/**
 * Minimal projection interface compatible with D3's GeoProjection
 *
 * This interface defines the subset of D3 projection methods used by
 * the composite projection system. Any D3 geo projection can be used,
 * but only these methods are required for composite building.
 *
 * Note: D3 projections use getter/setter pattern where calling without
 * arguments returns the current value, and with arguments sets and returns this.
 */
export interface ProjectionLike {
  /** Project geographic coordinates [longitude, latitude] to screen coordinates [x, y] */
  (coordinates: [number, number]): [number, number] | null

  /** Inverse project screen coordinates [x, y] to geographic coordinates [longitude, latitude] */
  invert?: (coordinates: [number, number]) => [number, number] | null

  /** Create a stream that transforms geographic geometry through this projection */
  stream: (stream: StreamLike) => StreamLike

  /** Scale getter/setter */
  scale: {
    (): number
    (scale: number): ProjectionLike
  }

  /** Translate getter/setter */
  translate: {
    (): [number, number]
    (translate: [number, number]): ProjectionLike
  }

  /** Center getter/setter (cylindrical projections) */
  center?: {
    (): [number, number]
    (center: [number, number]): ProjectionLike
  }

  /** Rotate getter/setter (conic/azimuthal projections) */
  rotate?: {
    (): [number, number, number]
    (angles: [number, number, number]): ProjectionLike
  }

  /** Parallels getter/setter (conic projections) */
  parallels?: {
    (): [number, number]
    (parallels: [number, number]): ProjectionLike
  }

  /** Clip extent getter/setter */
  clipExtent?: {
    (): [[number, number], [number, number]] | null
    (extent: [[number, number], [number, number]] | null): ProjectionLike
  }

  /** Clip angle getter/setter (azimuthal projections) */
  clipAngle?: {
    (): number
    (angle: number): ProjectionLike
  }

  /** Precision getter/setter */
  precision?: {
    (): number
    (precision: number): ProjectionLike
  }
}

/**
 * Geographic bounds in a structured format
 *
 * Represents a bounding box in geographic coordinates (WGS84).
 * Used for territory routing in composite projections.
 */
export interface GeoBounds {
  /** Minimum longitude (western boundary) */
  minLon: number
  /** Minimum latitude (southern boundary) */
  minLat: number
  /** Maximum longitude (eastern boundary) */
  maxLon: number
  /** Maximum latitude (northern boundary) */
  maxLat: number
}

/**
 * Geographic bounds as a 2D array
 *
 * Alternative format: [[minLon, minLat], [maxLon, maxLat]]
 * Compatible with D3's bounds format.
 */
export type GeoBoundsArray = [[number, number], [number, number]]

/**
 * Entry for a sub-projection in a composite projection
 *
 * Each territory in a composite projection has its own sub-projection
 * with associated bounds for routing geographic points.
 */
export interface SubProjectionEntry {
  /** Unique identifier for this sub-projection (e.g., territory code) */
  id: string
  /** Display name for the territory */
  name: string
  /** The D3-compatible projection for this territory */
  projection: ProjectionLike
  /** Geographic bounds for point routing (optional but recommended) */
  bounds?: GeoBounds
}

/**
 * Configuration for building a composite projection
 */
export interface CompositeProjectionConfig {
  /** Array of sub-projection entries */
  entries: SubProjectionEntry[]
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Result from point capture operations
 */
export interface PointCaptureResult {
  /** The stream that captures projected points */
  pointStream: StreamLike
  /** Get the last captured point (or null if none) */
  getCapturedPoint: () => [number, number] | null
  /** Reset the captured point to null */
  resetCapture: () => void
}

/**
 * Result from invert operations with bounds validation
 */
export interface InvertResult {
  /** The inverted geographic coordinates [longitude, latitude] */
  coordinates: [number, number]
  /** The ID of the territory that matched (if bounds validation was used) */
  territoryId?: string
}

/**
 * Options for invert operations
 */
export interface InvertOptions {
  /** Tolerance for bounds checking (default: 0.01 degrees) */
  tolerance?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Options for clip extent calculation
 */
export interface ClipExtentOptions {
  /** Small value for epsilon padding (default: 1e-6) */
  epsilon?: number
}
