/**
 * Positioning Module
 *
 * Canonical positioning format and conversion utilities for D3 projections.
 *
 * @module positioning
 */

// Applicator functions (applies canonical positioning to projections)
export {
  applyCanonicalPositioning,
  extractCanonicalFromProjection,
  getPositioningApplication,
  toPositioningFamily,
} from './applicator'

// Converter functions (convert between formats)
export {
  canonicalToCenter,
  canonicalToRotate,
  centerToCanonical,
  clampLatitude,
  inferCanonicalFromLegacy,
  normalizeCanonical,
  normalizeLongitude,
  rotateToCanonical,
} from './converters'
