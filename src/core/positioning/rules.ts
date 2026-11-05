import type { Positioning, PositioningView, PositionParameter } from './types'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { D3Center } from '@/types/positioning'

import { geoRotation } from 'd3-geo'

const PANNING_FAMILIES: ReadonlySet<ProjectionFamilyType> = new Set<ProjectionFamilyType>([
  'CYLINDRICAL',
  'PSEUDOCYLINDRICAL',
  'AZIMUTHAL',
  'POLYHEDRAL',
])

const GLOBAL_VIEW_PARALLELS: [number, number] = [44, 49]

export function getPositionParameter(
  family: ProjectionFamilyType,
  view: PositioningView,
): PositionParameter {
  if (view === 'composite' && family === 'CYLINDRICAL')
    return 'center'
  return 'rotate'
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
