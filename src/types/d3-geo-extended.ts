import type { GeoProjection } from 'd3-geo'

/**
 * Extended projection interface for conic projections that support parallel configuration.
 * This includes projections like Albers, Conic Conformal, and Conic Equal Area.
 */
export interface GeoConicProjection extends GeoProjection {
  /**
   * Get or set the standard parallels for the conic projection.
   */
  parallels: (() => [number, number]) & ((parallels: [number, number]) => this)
}

/**
 * Type guard to check if a projection is a conic projection with parallels support.
 * @param projection - The projection to check
 * @returns true if the projection has a parallels method
 */
export function isConicProjection(
  projection: GeoProjection,
): projection is GeoConicProjection {
  return typeof (projection as any).parallels === 'function'
}

/**
 * Factory function return type for conic projections.
 */
export type ConicProjectionFactory = () => GeoConicProjection
