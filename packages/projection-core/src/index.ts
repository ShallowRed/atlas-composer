/**
 * @atlas-composer/projection-core
 *
 * Core utilities for composite map projections.
 * Zero-dependency pure functions for stream handling, bounds checking,
 * and projection composition.
 *
 * @packageDocumentation
 */

// Bounds utilities
export { boundsFromArray, boundsToArray, isPointInBounds } from './bounds/checker'

export { calculateClipExtentFromBounds, calculateClipExtentFromPixelOffset } from './bounds/clip-extent'
// Composite builder
export { buildCompositeProjection } from './composite/builder'

// Invert utilities
export { invertWithBoundsValidation } from './invert/validator'
export { createStreamMultiplexer } from './stream/multiplexer'

// Stream utilities
export { createPointCaptureStream } from './stream/point-capture'

// Types
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
