import type { GeoProjection } from 'd3-geo'
import type { PositioningParameters, PositioningView } from './types'

import { placeCylindrical } from '@atlas-composer/projection-core'
import { isConicProjection } from '@/types/d3-geo-extended'

import { getDerivedParallels, getTargetRotate } from './rules'

// In the composite view, the id of the projection tells whether placeCylindrical moves the cut of a cylindrical projection opposite its center
export function applyPositioning(projection: GeoProjection, positioning: PositioningParameters, view: 'composite', projectionId: string): void
export function applyPositioning(projection: GeoProjection, positioning: PositioningParameters, view: 'global'): void
export function applyPositioning(
  projection: GeoProjection,
  positioning: PositioningParameters,
  view: PositioningView,
  projectionId?: string,
): void {
  if (view === 'composite') {
    const { center, rotate } = placeCylindrical(projectionId!, positioning)
    projection.center(center ?? [0, 0])
    projection.rotate(rotate ?? [0, 0, 0])
  }
  // The global view turns the globe to the target point, whichever parameter holds it,
  // and keeps the center of the factory; built-in composite projections have no rotate method
  else if ((positioning.rotate || positioning.center) && typeof projection.rotate === 'function') {
    projection.rotate(getTargetRotate(positioning))
  }

  if (isConicProjection(projection)) {
    const parallels = positioning.parallels ?? getDerivedParallels(positioning, view)
    if (parallels)
      projection.parallels(parallels)
  }
}
