import type { GeoProjection } from 'd3-geo'

import type {
  CanonicalPositioning,
  PositioningApplication,
  PositioningFamily,
} from '@/types/positioning'

import { canonicalToCenter, canonicalToRotate } from './converters'

export function getPositioningApplication(
  canonical: CanonicalPositioning,
  family: PositioningFamily,
): PositioningApplication {
  switch (family) {
    case 'CYLINDRICAL':
      return {
        center: canonicalToCenter(canonical),
      }

    case 'CONIC':
    case 'AZIMUTHAL':
      return {
        rotate: canonicalToRotate(canonical),
      }

    case 'OTHER':
    default:
      return {
        rotate: canonicalToRotate(canonical),
      }
  }
}

export function applyCanonicalPositioning(
  projection: GeoProjection,
  canonical: CanonicalPositioning,
  family: PositioningFamily,
): void {
  const application = getPositioningApplication(canonical, family)

  if (family === 'CYLINDRICAL') {
    if (application.center && projection.center) {
      projection.center(application.center)
    }
    if (projection.rotate) {
      projection.rotate([0, 0, 0])
    }
  }
  else {
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
