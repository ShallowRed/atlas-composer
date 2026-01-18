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

export function rotateToCanonical(rotate: D3Rotate | [number, number]): CanonicalPositioning {
  if (!isD3Rotate(rotate)) {
    return { ...DEFAULT_CANONICAL_POSITIONING }
  }

  return {
    focusLongitude: -(rotate[0] ?? 0),
    focusLatitude: -(rotate[1] ?? 0),
    rotateGamma: rotate[2] ?? 0,
  }
}

export function canonicalToCenter(canonical: CanonicalPositioning): D3Center {
  return [
    canonical.focusLongitude ?? 0,
    canonical.focusLatitude ?? 0,
  ]
}

export function canonicalToRotate(canonical: CanonicalPositioning): D3Rotate {
  return [
    // Negate to convert from focus point to rotation
    -(canonical.focusLongitude ?? 0),
    -(canonical.focusLatitude ?? 0),
    canonical.rotateGamma ?? 0,
  ]
}

export function inferCanonicalFromLegacy(params: {
  center?: [number, number] | null
  rotate?: [number, number, number] | [number, number] | null
}): CanonicalPositioning {
  const { center, rotate } = params

  if (center && isD3Center(center)) {
    const hasNonZero = center[0] !== 0 || center[1] !== 0
    if (hasNonZero) {
      return centerToCanonical(center)
    }
  }

  if (rotate && isD3Rotate(rotate)) {
    const hasNonZero = rotate[0] !== 0 || rotate[1] !== 0
    if (hasNonZero) {
      return rotateToCanonical(rotate)
    }
  }

  return { ...DEFAULT_CANONICAL_POSITIONING }
}

export function normalizeLongitude(lon: number): number {
  while (lon > 180) lon -= 360
  while (lon < -180) lon += 360
  return lon
}

export function clampLatitude(lat: number): number {
  return Math.max(-90, Math.min(90, lat))
}

export function normalizeCanonical(canonical: CanonicalPositioning): CanonicalPositioning {
  return {
    focusLongitude: normalizeLongitude(canonical.focusLongitude),
    focusLatitude: clampLatitude(canonical.focusLatitude),
    rotateGamma: canonical.rotateGamma ?? 0,
  }
}
