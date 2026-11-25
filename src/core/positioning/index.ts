export { applyPositioning } from './applicator'

export {
  completeRotate,
  convertPositioning,
  replaceDeprecatedPositioning,
} from './converters'

export { getDisplayedCenter, getDisplayedRotate, updatePositioningAxis } from './editing'

export { cornerHitSize, edgesBeyond, frameFromRect, frameHandles, framesOfTerritories, moveOffset, nearestTerritory, rectFromCorners, rectFromFrame, resizeFrame, visiblePart } from './frame'
export type { CanvasRect, CompositionBorder, EdgesBeyond, FrameExtent, FrameHandle, FrameOfTerritories, HandleIndex, TerritoryShape } from './frame'

export { subProjectionAnchor, subProjectionScale } from './placement'

export {
  getDerivedParallels,
  getPositionParameter,
  getTargetCoordinates,
  supportsPanning,
  usesPositionParameter,
} from './rules'

export type {
  D3Rotate,
  DeprecatedPositioning,
  Positioning,
  PositioningView,
  PositionParameter,
} from './types'
