import type { GeoProjection } from 'd3-geo'
import type { PositioningParameters, PositioningView } from './types'

import { isConicProjection } from '@/types/d3-geo-extended'

import { getDerivedParallels, getTargetRotate } from './rules'

export function applyPositioning(
  projection: GeoProjection,
  positioning: PositioningParameters,
  view: PositioningView,
): void {
  if (view === 'composite') {
    projection.center(positioning.center ?? [0, 0])
    projection.rotate(positioning.rotate ?? [0, 0, 0])
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
