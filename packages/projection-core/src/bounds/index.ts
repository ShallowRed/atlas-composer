/**
 * Bounds Utilities
 *
 * Pure functions for geographic bounds manipulation.
 * Used by composite projections for point routing and clip extent calculation.
 */

export { boundsFromArray, boundsToArray, isPointInBounds } from './checker'
export { calculateClipExtentFromBounds, calculateClipExtentFromPixelOffset } from './clip-extent'
