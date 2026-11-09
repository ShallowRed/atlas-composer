export { boundsFromArray, boundsToArray, isPointInBounds } from './bounds/checker'
export { calculateClipExtentFromBounds, calculateClipExtentFromPixelOffset } from './bounds/clip-extent'
export { applyRenderingParameters } from './bounds/rendering-parameters'
export type { RenderingParameters } from './bounds/rendering-parameters'
export { buildCompositeProjection } from './composite/builder'
export { invertWithBoundsValidation } from './invert/validator'
export { createStreamMultiplexer } from './stream/multiplexer'
export { createPointCaptureStream } from './stream/point-capture'

export type {
  ClipExtentOptions,
  CompositeProjectionConfig,
  GeoBounds,
  GeoBoundsArray,
  InvertOptions,
  InvertResult,
  PointCaptureResult,
  ProjectionLike,
  StreamLike,
  SubProjectionEntry,
} from './types'
