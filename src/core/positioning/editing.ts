import type { D3Rotate, Positioning, PositioningView, PositionParameter } from './types'

import { completeRotate } from './converters'
import { getTargetRotate } from './rules'

// The global view turns the globe to the target point, whichever parameter holds it
export function getDisplayedRotate(positioning: Positioning, view: PositioningView): D3Rotate {
  return view === 'global' ? getTargetRotate(positioning) : completeRotate(positioning.rotate)
}

// The global view holds the positioning in rotate alone; the composite view keeps the other parameter
export function updatePositioningAxis(
  positioning: Positioning,
  view: PositioningView,
  parameter: PositionParameter,
  axis: number,
  value: number,
): Positioning {
  if (view === 'global') {
    const rotate = getDisplayedRotate(positioning, view)
    rotate[axis] = value
    return { rotate, center: undefined }
  }

  const updated = parameter === 'rotate' ? getDisplayedRotate(positioning, view) : getDisplayedCenter(positioning)
  updated[axis] = value
  return { rotate: positioning.rotate, center: positioning.center, [parameter]: updated }
}

export function getDisplayedCenter(positioning: Positioning): [number, number] {
  const [longitude = 0, latitude = 0] = positioning.center ?? []
  return [longitude, latitude]
}
