/**
 * Positioning Applicator
 *
 * Applies canonical positioning to D3 projections based on projection family.
 * This is the single point where positioning format conversion happens.
 */

import type { GeoProjection } from 'd3-geo'

import type {
  CanonicalPositioning,
  PositioningApplication,
  PositioningFamily,
} from '@/types/positioning'

import { canonicalToCenter, canonicalToRotate } from './converters'

/**
 * Determine the positioning application for a projection family
 *
 * @param canonical - Canonical positioning (geographic focus point)
 * @param family - Projection family
 * @returns Object with center and/or rotate values to apply
 *
 * @example
 * ```typescript
 * const app = getPositioningApplication(
 *   { focusLongitude: 2.5, focusLatitude: 46.5 },
 *   'CYLINDRICAL'
 * )
 * // { center: [2.5, 46.5] }
 *
 * const app2 = getPositioningApplication(
 *   { focusLongitude: 2.5, focusLatitude: 46.5 },
 *   'CONIC'
 * )
 * // { rotate: [-2.5, -46.5, 0] }
 * ```
 */
export function getPositioningApplication(
  canonical: CanonicalPositioning,
  family: PositioningFamily,
): PositioningApplication {
  switch (family) {
    case 'CYLINDRICAL':
      // Cylindrical projections use center() for positioning
      // center() places the geographic point at the translate position
      return {
        center: canonicalToCenter(canonical),
      }

    case 'CONIC':
    case 'AZIMUTHAL':
      // Conic and Azimuthal projections use rotate() for positioning
      // rotate() rotates the globe so the negated point is centered
      return {
        rotate: canonicalToRotate(canonical),
      }

    case 'OTHER':
    default:
      // For other/unknown families, use rotate as the safer default
      // Most D3 projections support rotate()
      return {
        rotate: canonicalToRotate(canonical),
      }
  }
}

/**
 * Apply canonical positioning to a D3 projection
 *
 * This is the main function that converts canonical positioning to
 * projection-specific D3 method calls.
 *
 * @param projection - D3 projection to configure
 * @param canonical - Canonical positioning (geographic focus point)
 * @param family - Projection family determining which D3 method to use
 *
 * @example
 * ```typescript
 * const projection = d3.geoMercator()
 * applyCanonicalPositioning(
 *   projection,
 *   { focusLongitude: 2.5, focusLatitude: 46.5 },
 *   'CYLINDRICAL'
 * )
 * // Internally calls: projection.center([2.5, 46.5])
 * ```
 */
export function applyCanonicalPositioning(
  projection: GeoProjection,
  canonical: CanonicalPositioning,
  family: PositioningFamily,
): void {
  const application = getPositioningApplication(canonical, family)

  if (family === 'CYLINDRICAL') {
    // CYLINDRICAL: Use center(), reset rotate
    if (application.center && projection.center) {
      projection.center(application.center)
    }
    if (projection.rotate) {
      projection.rotate([0, 0, 0])
    }
  }
  else {
    // CONIC/AZIMUTHAL/OTHER: Use rotate(), reset center
    if (application.rotate && projection.rotate) {
      projection.rotate(application.rotate)
    }
    if (projection.center) {
      projection.center([0, 0])
    }
  }
}

/**
 * Extract canonical positioning from current projection state
 *
 * Reads the current center/rotate from a projection and converts
 * to canonical format. Useful for capturing user's current view.
 *
 * @param projection - D3 projection to read from
 * @param family - Projection family to determine which value to read
 * @returns Canonical positioning representing current view
 */
export function extractCanonicalFromProjection(
  projection: GeoProjection,
  family: PositioningFamily,
): CanonicalPositioning {
  if (family === 'CYLINDRICAL') {
    const center = projection.center?.() ?? [0, 0]
    return {
      focusLongitude: center[0],
      focusLatitude: center[1],
      rotateGamma: 0,
    }
  }
  else {
    const rotate = projection.rotate?.() ?? [0, 0, 0]
    return {
      focusLongitude: -(rotate[0] ?? 0),
      focusLatitude: -(rotate[1] ?? 0),
      rotateGamma: rotate[2] ?? 0,
    }
  }
}

/**
 * Map projection family string to PositioningFamily type
 */
export function toPositioningFamily(family: string | undefined): PositioningFamily {
  if (!family)
    return 'OTHER'

  const normalized = family.toUpperCase()
  if (normalized === 'CYLINDRICAL')
    return 'CYLINDRICAL'
  if (normalized === 'CONIC')
    return 'CONIC'
  if (normalized === 'AZIMUTHAL')
    return 'AZIMUTHAL'
  return 'OTHER'
}
