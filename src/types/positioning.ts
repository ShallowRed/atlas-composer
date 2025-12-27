/**
 * Canonical Positioning Types
 *
 * Projection-agnostic positioning format that eliminates the need for
 * parameter conversion when switching between projection families.
 *
 * ## Design Rationale
 *
 * D3 projections use different methods for positioning based on family:
 * - CYLINDRICAL: center([lon, lat]) - places geographic point at translate
 * - CONIC/AZIMUTHAL: rotate([λ, φ, γ]) - rotates globe before projection
 *
 * These are mathematically related:
 * - center → rotate: rotate = [-center[0], -center[1], 0]
 * - rotate → center: center = [-rotate[0], -rotate[1]]
 *
 * The canonical format stores the GEOGRAPHIC FOCUS POINT - the location
 * the user wants centered in the view. Conversion to D3 methods happens
 * at render time based on projection family.
 *
 * @example
 * ```typescript
 * // User wants to focus on Paris (2.35°E, 48.86°N)
 * const positioning: CanonicalPositioning = {
 *   focusLongitude: 2.35,
 *   focusLatitude: 48.86
 * }
 *
 * // At render time, converted based on projection:
 * // - Mercator: projection.center([2.35, 48.86])
 * // - Albers: projection.rotate([-2.35, -48.86, 0])
 * ```
 */

/**
 * Canonical positioning format - projection-agnostic geographic focus point
 */
export interface CanonicalPositioning {
  /**
   * Longitude of the geographic focus point (-180 to 180)
   * This is the longitude that will appear at the center of the projection
   */
  focusLongitude: number

  /**
   * Latitude of the geographic focus point (-90 to 90)
   * This is the latitude that will appear at the center of the projection
   */
  focusLatitude: number

  /**
   * Optional third rotation axis (gamma) for tilting the projection
   * Most projections don't use this, but it's preserved for completeness
   * Range: -180 to 180
   */
  rotateGamma?: number
}

/**
 * D3 center format: [longitude, latitude]
 * Used by CYLINDRICAL projections (Mercator, Equirectangular, etc.)
 */
export type D3Center = [number, number]

/**
 * D3 rotate format: [lambda, phi, gamma]
 * Used by CONIC and AZIMUTHAL projections
 * - lambda: longitude rotation
 * - phi: latitude rotation
 * - gamma: roll/tilt (usually 0)
 */
export type D3Rotate = [number, number, number]

/**
 * Projection families that determine how positioning is applied
 */
export type PositioningFamily = 'CYLINDRICAL' | 'CONIC' | 'AZIMUTHAL' | 'OTHER'

/**
 * Result of applying canonical positioning to a projection
 * Contains the D3 method calls that should be made
 */
export interface PositioningApplication {
  /** Use projection.center() with these values (CYLINDRICAL) */
  center?: D3Center
  /** Use projection.rotate() with these values (CONIC/AZIMUTHAL/OTHER) */
  rotate?: D3Rotate
}

/**
 * Default canonical positioning (centered on prime meridian and equator)
 */
export const DEFAULT_CANONICAL_POSITIONING: CanonicalPositioning = {
  focusLongitude: 0,
  focusLatitude: 0,
  rotateGamma: 0,
}

/**
 * Type guard to check if a value is a valid CanonicalPositioning
 */
export function isCanonicalPositioning(value: unknown): value is CanonicalPositioning {
  if (!value || typeof value !== 'object')
    return false
  const pos = value as Record<string, unknown>
  return (
    typeof pos.focusLongitude === 'number'
    && typeof pos.focusLatitude === 'number'
    && !Number.isNaN(pos.focusLongitude)
    && !Number.isNaN(pos.focusLatitude)
    && pos.focusLongitude >= -180
    && pos.focusLongitude <= 180
    && pos.focusLatitude >= -90
    && pos.focusLatitude <= 90
  )
}

/**
 * Type guard to check if a value is a valid D3 center array
 */
export function isD3Center(value: unknown): value is D3Center {
  if (!Array.isArray(value) || value.length !== 2)
    return false
  return value.every(v => typeof v === 'number' && !Number.isNaN(v))
}

/**
 * Type guard to check if a value is a valid D3 rotate array
 */
export function isD3Rotate(value: unknown): value is D3Rotate {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3)
    return false
  return value.every(v => typeof v === 'number' && !Number.isNaN(v))
}
