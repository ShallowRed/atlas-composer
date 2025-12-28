/**
 * Positioning Converters
 *
 * Pure functions for converting between canonical positioning format
 * and D3 projection-specific formats (center/rotate).
 *
 * ## Coordinate Relationships
 *
 * The canonical format uses geographic coordinates directly:
 * - focusLongitude: The longitude to center on
 * - focusLatitude: The latitude to center on
 *
 * D3 center() and rotate() have an inverse relationship:
 * - center([lon, lat]): Places (lon, lat) at the translate point
 * - rotate([λ, φ, γ]): Rotates globe so (-λ, -φ) is at the center
 *
 * Therefore:
 * - To focus on (lon, lat) with center(): center([lon, lat])
 * - To focus on (lon, lat) with rotate(): rotate([-lon, -lat, gamma])
 */

import type {
  CanonicalPositioning,
  D3Center,
  D3Rotate,
} from '@/types/positioning'

import {
  DEFAULT_CANONICAL_POSITIONING,
  isD3Center,
  isD3Rotate,
} from '@/types/positioning'

/**
 * Convert D3 center format to canonical positioning
 *
 * @param center - D3 center array [longitude, latitude]
 * @returns Canonical positioning with focus point
 *
 * @example
 * ```typescript
 * const canonical = centerToCanonical([2.35, 48.86])
 * // { focusLongitude: 2.35, focusLatitude: 48.86, rotateGamma: 0 }
 * ```
 */
export function centerToCanonical(center: D3Center): CanonicalPositioning {
  if (!isD3Center(center)) {
    return { ...DEFAULT_CANONICAL_POSITIONING }
  }

  return {
    focusLongitude: center[0],
    focusLatitude: center[1],
    rotateGamma: 0,
  }
}

/**
 * Convert D3 rotate format to canonical positioning
 *
 * @param rotate - D3 rotate array [lambda, phi, gamma?]
 * @returns Canonical positioning with focus point
 *
 * @example
 * ```typescript
 * const canonical = rotateToCanonical([-2.35, -48.86, 0])
 * // { focusLongitude: 2.35, focusLatitude: 48.86, rotateGamma: 0 }
 * ```
 */
export function rotateToCanonical(rotate: D3Rotate | [number, number]): CanonicalPositioning {
  if (!isD3Rotate(rotate)) {
    return { ...DEFAULT_CANONICAL_POSITIONING }
  }

  return {
    // Negate to convert from rotation to focus point
    focusLongitude: -(rotate[0] ?? 0),
    focusLatitude: -(rotate[1] ?? 0),
    rotateGamma: rotate[2] ?? 0,
  }
}

/**
 * Convert canonical positioning to D3 center format
 *
 * @param canonical - Canonical positioning
 * @returns D3 center array [longitude, latitude]
 *
 * @example
 * ```typescript
 * const center = canonicalToCenter({ focusLongitude: 2.35, focusLatitude: 48.86 })
 * // [2.35, 48.86]
 * ```
 */
export function canonicalToCenter(canonical: CanonicalPositioning): D3Center {
  return [
    canonical.focusLongitude ?? 0,
    canonical.focusLatitude ?? 0,
  ]
}

/**
 * Convert canonical positioning to D3 rotate format
 *
 * @param canonical - Canonical positioning
 * @returns D3 rotate array [lambda, phi, gamma]
 *
 * @example
 * ```typescript
 * const rotate = canonicalToRotate({ focusLongitude: 2.35, focusLatitude: 48.86 })
 * // [-2.35, -48.86, 0]
 * ```
 */
export function canonicalToRotate(canonical: CanonicalPositioning): D3Rotate {
  return [
    // Negate to convert from focus point to rotation
    -(canonical.focusLongitude ?? 0),
    -(canonical.focusLatitude ?? 0),
    canonical.rotateGamma ?? 0,
  ]
}

/**
 * Infer canonical positioning from legacy parameters
 *
 * Legacy presets may have either center or rotate defined.
 * This function infers the canonical focus point from whichever is available.
 *
 * Priority:
 * 1. If center is defined and non-zero, use it directly
 * 2. If rotate is defined and non-zero, convert it
 * 3. Otherwise, return defaults
 *
 * @param params - Legacy parameters object
 * @param params.center - Optional D3 center array [longitude, latitude]
 * @param params.rotate - Optional D3 rotate array [lambda, phi, gamma?]
 * @returns Canonical positioning
 */
export function inferCanonicalFromLegacy(params: {
  center?: [number, number] | null
  rotate?: [number, number, number] | [number, number] | null
}): CanonicalPositioning {
  const { center, rotate } = params

  // Check if center has meaningful values
  if (center && isD3Center(center)) {
    const hasNonZero = center[0] !== 0 || center[1] !== 0
    if (hasNonZero) {
      return centerToCanonical(center)
    }
  }

  // Check if rotate has meaningful values
  if (rotate && isD3Rotate(rotate)) {
    const hasNonZero = rotate[0] !== 0 || rotate[1] !== 0
    if (hasNonZero) {
      return rotateToCanonical(rotate)
    }
  }

  // Default positioning
  return { ...DEFAULT_CANONICAL_POSITIONING }
}

/**
 * Normalize longitude to -180 to 180 range
 */
export function normalizeLongitude(lon: number): number {
  while (lon > 180) lon -= 360
  while (lon < -180) lon += 360
  return lon
}

/**
 * Clamp latitude to -90 to 90 range
 */
export function clampLatitude(lat: number): number {
  return Math.max(-90, Math.min(90, lat))
}

/**
 * Normalize canonical positioning values to valid ranges
 */
export function normalizeCanonical(canonical: CanonicalPositioning): CanonicalPositioning {
  return {
    focusLongitude: normalizeLongitude(canonical.focusLongitude),
    focusLatitude: clampLatitude(canonical.focusLatitude),
    rotateGamma: canonical.rotateGamma ?? 0,
  }
}
