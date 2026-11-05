import type { D3Rotate, DeprecatedPositioning, Positioning } from './types'
import type { ProjectionFamilyType } from '@/core/projections/types'

import { getPositionParameter, getTargetCoordinates } from './rules'

function positionTarget(
  longitude: number,
  latitude: number,
  gamma: number,
  family: ProjectionFamilyType,
): Positioning {
  if (getPositionParameter(family, 'composite') === 'center')
    return { center: [longitude, latitude], rotate: undefined }
  return { center: undefined, rotate: [-longitude, -latitude, gamma] }
}

function convertDeprecatedPositioning(
  deprecated: DeprecatedPositioning,
  family: ProjectionFamilyType,
): Positioning | undefined {
  const { focusLongitude, focusLatitude, rotateGamma } = deprecated
  if (focusLongitude === undefined && focusLatitude === undefined)
    return undefined
  return positionTarget(focusLongitude ?? 0, focusLatitude ?? 0, rotateGamma ?? 0, family)
}

// A gamma without focus coordinates turns around the target point of the file,
// else around the target point of the fallback positioning.
function convertGamma(
  gamma: number | undefined,
  positioning: Positioning,
  fallback: Positioning,
  family: ProjectionFamilyType,
): Positioning | undefined {
  if (gamma === undefined)
    return undefined
  const target = positioning.rotate || positioning.center ? positioning : fallback
  const [longitude, latitude] = getTargetCoordinates(target)
  return positionTarget(longitude, latitude, gamma, family)
}

export function replaceDeprecatedPositioning<T extends DeprecatedPositioning & Positioning>(
  parameters: T,
  family: ProjectionFamilyType,
  fallback: Positioning = {},
): Omit<T, keyof DeprecatedPositioning> & Positioning {
  const { focusLongitude, focusLatitude, rotateGamma, ...rest } = parameters
  const converted = convertDeprecatedPositioning({ focusLongitude, focusLatitude, rotateGamma }, family)
    ?? convertGamma(rotateGamma, rest, fallback, family)
  return converted ? { ...rest, ...converted } : rest
}

export function convertPositioning(
  positioning: Positioning,
  family: ProjectionFamilyType,
): Positioning {
  const [longitude, latitude] = getTargetCoordinates(positioning)
  return positionTarget(longitude, latitude, positioning.rotate?.[2] ?? 0, family)
}

export function completeRotate(rotate: Positioning['rotate']): D3Rotate {
  const [lambda = 0, phi = 0, gamma = 0] = rotate ?? []
  return [lambda, phi, gamma]
}
