import type { GeoProjection } from 'd3-geo'
import type { PositioningParameters, PositioningView } from './types'

import type {
  CanonicalPositioning,
  PositioningApplication,
  PositioningFamily,
} from '@/types/positioning'

import { isConicProjection } from '@/types/d3-geo-extended'

import { canonicalToCenter, canonicalToRotate } from './converters'
import { getDerivedParallels } from './rules'

export function applyPositioning(
  projection: GeoProjection,
  positioning: PositioningParameters,
  view: PositioningView,
): void {
  const center = positioning.center ?? (view === 'composite' ? [0, 0] : undefined)
  const rotate = positioning.rotate ?? (view === 'composite' ? [0, 0, 0] : undefined)

  if (center)
    projection.center(center)
  if (rotate)
    projection.rotate(rotate)

  if (isConicProjection(projection)) {
    const parallels = positioning.parallels ?? getDerivedParallels(positioning, view)
    if (parallels)
      projection.parallels(parallels)
  }
}

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
