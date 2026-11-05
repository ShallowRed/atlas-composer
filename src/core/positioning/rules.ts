import type { D3Center, D3Rotate, Positioning, PositioningView, PositionParameter } from './types'
import type { ProjectionFamilyType } from '@/core/projections/types'

import { geoRotation } from 'd3-geo'

const PANNING_FAMILIES: ReadonlySet<ProjectionFamilyType> = new Set<ProjectionFamilyType>([
  'CYLINDRICAL',
  'PSEUDOCYLINDRICAL',
  'AZIMUTHAL',
  'POLYHEDRAL',
])

const GLOBAL_VIEW_PARALLELS: [number, number] = [44, 49]

const VIEWS: PositioningView[] = ['composite', 'global']

export function getPositionParameter(
  family: ProjectionFamilyType,
  view: PositioningView,
): PositionParameter {
  if (view === 'composite' && family === 'CYLINDRICAL')
    return 'center'
  return 'rotate'
}

export function usesPositionParameter(
  family: ProjectionFamilyType,
  parameter: PositionParameter,
): boolean {
  return VIEWS.some(view => getPositionParameter(family, view) === parameter)
}

export function supportsPanning(family: ProjectionFamilyType): boolean {
  return PANNING_FAMILIES.has(family)
}

export function getTargetCoordinates(positioning: Positioning): D3Center {
  const rotate = positioning.rotate ?? [0, 0, 0]
  const center = positioning.center ?? [0, 0]
  const [longitude, latitude] = geoRotation(rotate).invert(center)
  return [longitude, latitude]
}

export function getTargetRotate(positioning: Positioning): D3Rotate {
  const [longitude, latitude] = getTargetCoordinates(positioning)
  return [-longitude, -latitude, positioning.rotate?.[2] ?? 0]
}

export function getDerivedParallels(
  positioning: Positioning,
  view: PositioningView,
): [number, number] | undefined {
  if (view === 'global')
    return [...GLOBAL_VIEW_PARALLELS]

  const latitude = getTargetCoordinates(positioning)[1]
  if (latitude === 0)
    return undefined
  return [latitude - 2, latitude + 2]
}
