/**
 * Atlas Composer Specification
 *
 * TypeScript types defining the composite map projection configuration format.
 * This is the single source of truth for the Atlas Composer export format.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Internationalized string - either a plain string or an object with language codes.
 *
 * @example
 * // Plain string
 * "France"
 *
 * @example
 * // Internationalized
 * { "en": "France", "fr": "France" }
 */
export type I18nString = string | { en: string, fr?: string, [lang: string]: string | undefined }

/**
 * Geographic bounds as [[minLon, minLat], [maxLon, maxLat]]
 *
 * @example
 * [[-6.5, 41], [10, 51]] // France metropolitan
 */
export type GeoBounds = [[number, number], [number, number]]

/**
 * Projection family categories.
 * Determines which parameters are relevant for a given projection.
 */
export type ProjectionFamily
  = | 'CYLINDRICAL'
    | 'CONIC'
    | 'AZIMUTHAL'
    | 'PSEUDOCYLINDRICAL'
    | 'POLYCONIC'
    | 'MISCELLANEOUS'

// =============================================================================
// Projection Parameters
// =============================================================================

/**
 * Projection parameters controlling how geographic coordinates are transformed.
 *
 * Different projection families use different subsets of these parameters:
 * - **Cylindrical**: `center` (longitude, latitude)
 * - **Conic**: `rotate` (lambda, phi), `parallels` (south, north)
 * - **Azimuthal**: `rotate` (lambda, phi, gamma)
 *
 * @example
 * // Conic projection (Lambert Conformal)
 * {
 *   rotate: [-3, -46.5, 0],
 *   parallels: [44, 49],
 *   scaleMultiplier: 1
 * }
 *
 * @example
 * // Cylindrical projection (Mercator)
 * {
 *   center: [-61.46, 16.14],
 *   scaleMultiplier: 1.2
 * }
 */
export interface ProjectionParameters {
  /**
   * Rotation angles [lambda, phi, gamma?] in degrees.
   * - lambda: Longitude rotation (moves center of projection)
   * - phi: Latitude rotation (tilts the projection)
   * - gamma: Roll angle (optional, rotates around viewing axis)
   *
   * Used by: conic, azimuthal projections
   */
  rotate?: [number, number] | [number, number, number]

  /**
   * Center point [longitude, latitude] in degrees.
   * Sets the geographic center of the projection.
   *
   * Used by: cylindrical projections
   */
  center?: [number, number]

  /**
   * Standard parallels [south, north] in degrees.
   * Lines of latitude where the projection has no distortion.
   *
   * Used by: conic projections
   */
  parallels?: [number, number]

  /**
   * Scale multiplier applied to the reference scale.
   * Values > 1 zoom in, < 1 zoom out.
   *
   * @default 1
   */
  scaleMultiplier?: number

  /**
   * Direct scale value (rarely used, prefer scaleMultiplier).
   */
  scale?: number

  /**
   * Clip angle in degrees (0-180).
   * Limits the visible area of azimuthal projections.
   *
   * Used by: azimuthal projections
   */
  clipAngle?: number

  /**
   * Distance parameter for satellite projection.
   * Distance from the center of the Earth in radii.
   */
  distance?: number

  /**
   * Tilt parameter for satellite projection.
   * Angle of the camera in degrees.
   */
  tilt?: number

  /**
   * Projection precision for adaptive resampling.
   * Lower values produce smoother curves at the cost of performance.
   *
   * @default 0.5
   */
  precision?: number

  // ==========================================================================
  // Legacy parameters (for backward compatibility with older configurations)
  // ==========================================================================

  /**
   * @deprecated Use `center[0]` or `rotate[0]` instead.
   * Legacy focus longitude parameter.
   */
  focusLongitude?: number

  /**
   * @deprecated Use `center[1]` or `rotate[1]` instead.
   * Legacy focus latitude parameter.
   */
  focusLatitude?: number
}

// =============================================================================
// Layout Configuration
// =============================================================================

/**
 * Layout configuration for positioning a territory on the canvas.
 *
 * @example
 * {
 *   translateOffset: [110, 0],      // Move 110px right from center
 *   pixelClipExtent: [-280, -250, 270, 250]  // Clip boundaries
 * }
 */
export interface LayoutConfig {
  /**
   * Translation offset [x, y] in pixels from canvas center.
   * Positions the territory on the composite canvas.
   */
  translateOffset: [number, number]

  /**
   * Pixel-based clip extent [x1, y1, x2, y2] relative to territory center.
   * Defines the visible area for this territory.
   *
   * Coordinates are relative to the territory's translated position:
   * - x1, y1: Top-left corner offset
   * - x2, y2: Bottom-right corner offset
   */
  pixelClipExtent: [number, number, number, number]
}

// =============================================================================
// Territory Configuration
// =============================================================================

/**
 * Configuration for a single territory within the composite projection.
 *
 * Each territory has its own projection, layout position, and geographic bounds.
 *
 * @example
 * {
 *   code: "FR-MET",
 *   name: "France Métropolitaine",
 *   projection: {
 *     id: "conic-conformal",
 *     family: "CONIC",
 *     parameters: { rotate: [-3, -46.5, 0], parallels: [44, 49] }
 *   },
 *   layout: {
 *     translateOffset: [110, 0],
 *     pixelClipExtent: [-280, -250, 270, 250]
 *   },
 *   bounds: [[-6.5, 41], [10, 51]]
 * }
 */
export interface TerritoryConfig {
  /**
   * Unique territory code following ISO 3166-2 pattern.
   *
   * @example "FR-MET", "FR-GP", "PT-20", "US-AK"
   */
  code: string

  /**
   * Human-readable territory name.
   * Can be a plain string or internationalized.
   */
  name: I18nString

  /**
   * Projection configuration for this territory.
   */
  projection: {
    /**
     * Projection identifier matching D3 projection name.
     *
     * @example "mercator", "conic-conformal", "albers", "azimuthal-equal-area"
     */
    id: string

    /**
     * Projection family category.
     */
    family: ProjectionFamily

    /**
     * Projection parameters.
     */
    parameters: ProjectionParameters
  }

  /**
   * Layout configuration for positioning on canvas.
   */
  layout: LayoutConfig

  /**
   * Geographic bounds [[minLon, minLat], [maxLon, maxLat]].
   * Used for routing geographic features to the correct sub-projection.
   */
  bounds: GeoBounds
}

// =============================================================================
// Metadata
// =============================================================================

/**
 * Configuration metadata for provenance and compatibility tracking.
 *
 * @example
 * {
 *   atlasId: "france",
 *   atlasName: "France",
 *   exportDate: "2025-10-17T21:04:33.403Z",
 *   createdWith: "Atlas Composer v2.0"
 * }
 */
export interface ConfigMetadata {
  /**
   * Target atlas identifier.
   * Must match a known atlas in Atlas Composer.
   *
   * @example "france", "portugal", "usa", "europe"
   */
  atlasId: string

  /**
   * Human-readable atlas name.
   */
  atlasName?: I18nString

  /**
   * ISO 8601 timestamp when the configuration was exported.
   */
  exportDate?: string

  /**
   * Tool or method used to create this configuration.
   *
   * @example "Atlas Composer v2.0", "Manual"
   */
  createdWith?: string

  /**
   * Additional notes about the configuration.
   */
  notes?: string

  /**
   * Allow additional metadata fields for extensibility.
   */
  [key: string]: unknown
}

/**
 * Canvas dimensions in pixels.
 */
export interface CanvasDimensions {
  /** Canvas width in pixels */
  width: number
  /** Canvas height in pixels */
  height: number
}

// =============================================================================
// Atlas Metadata (Optional)
// =============================================================================

/**
 * Optional atlas-level projection metadata.
 * Contains recommendations and defaults for the atlas.
 */
export interface AtlasMetadata {
  /**
   * Available d3-composite-projections for this atlas.
   *
   * @example ["conic-conformal-france"]
   */
  compositeProjections?: string[]

  /**
   * Default composite projection to use.
   */
  defaultCompositeProjection?: string

  /**
   * Projection preferences for this atlas.
   */
  projectionPreferences?: {
    /** Recommended projection IDs */
    recommended?: string[]
    /** Prohibited projection IDs (inappropriate for this atlas) */
    prohibited?: string[]
  }

  /**
   * Recommended projection parameters.
   */
  projectionParameters?: {
    center?: { longitude: number, latitude: number }
    rotate?: {
      conic?: [number, number]
      azimuthal?: [number, number]
    }
    parallels?: {
      conic?: [number, number]
    }
  }
}

// =============================================================================
// Main Configuration Type
// =============================================================================

/**
 * Complete composite projection configuration.
 *
 * This is the main export format for Atlas Composer configurations.
 * Use with `@atlas-composer/projection-loader` to create D3-compatible projections.
 *
 * @example
 * ```typescript
 * import { loadCompositeProjection } from '@atlas-composer/projection-loader'
 * import config from './france-composite.json'
 *
 * const projection = loadCompositeProjection(config, { width: 800, height: 600 })
 * ```
 *
 * @example
 * ```json
 * {
 *   "version": "1.0",
 *   "metadata": { "atlasId": "france", "atlasName": "France" },
 *   "referenceScale": 2700,
 *   "canvasDimensions": { "width": 760, "height": 500 },
 *   "territories": [
 *     {
 *       "code": "FR-MET",
 *       "name": "France Métropolitaine",
 *       "projection": { "id": "conic-conformal", "family": "CONIC", "parameters": { ... } },
 *       "layout": { "translateOffset": [110, 0], "pixelClipExtent": [...] },
 *       "bounds": [[-6.5, 41], [10, 51]]
 *     }
 *   ]
 * }
 * ```
 */
export interface CompositeProjectionConfig {
  /**
   * JSON Schema reference (optional, for validation).
   */
  $schema?: string

  /**
   * Specification version.
   * Current version: "1.0"
   */
  version: string

  /**
   * Configuration metadata.
   */
  metadata: ConfigMetadata

  /**
   * Reference scale for territory scaling.
   * Individual territories use `scaleMultiplier` relative to this value.
   */
  referenceScale: number

  /**
   * Canvas dimensions for the composite projection.
   */
  canvasDimensions: CanvasDimensions

  /**
   * Array of territory configurations.
   * Each territory has its own projection and layout.
   */
  territories: TerritoryConfig[]

  /**
   * Optional atlas-level metadata with projection recommendations.
   */
  atlasMetadata?: AtlasMetadata
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Type guard to check if a value is a valid CompositeProjectionConfig.
 */
export function isCompositeProjectionConfig(value: unknown): value is CompositeProjectionConfig {
  if (typeof value !== 'object' || value === null)
    return false
  const config = value as Record<string, unknown>
  return (
    typeof config.version === 'string'
    && typeof config.metadata === 'object'
    && typeof config.referenceScale === 'number'
    && typeof config.canvasDimensions === 'object'
    && Array.isArray(config.territories)
  )
}

/**
 * Extract territory codes from a configuration.
 */
export function getTerritoryCodes(config: CompositeProjectionConfig): string[] {
  return config.territories.map(t => t.code)
}

/**
 * Find a territory by code.
 */
export function findTerritory(
  config: CompositeProjectionConfig,
  code: string,
): TerritoryConfig | undefined {
  return config.territories.find(t => t.code === code)
}

// =============================================================================
// Version Constants
// =============================================================================

/**
 * Current specification version.
 */
export const SPECIFICATION_VERSION = '1.0'

/**
 * Minimum supported specification version.
 */
export const MIN_SUPPORTED_VERSION = '1.0'
