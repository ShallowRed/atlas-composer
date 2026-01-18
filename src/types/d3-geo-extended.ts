import type { GeoProjection } from 'd3-geo'

/**
 * Extended projection interface for conic projections that support parallel configuration.
 * This includes projections like Albers, Conic Conformal, and Conic Equal Area.
 */
export interface GeoConicProjection extends GeoProjection {
  parallels: (() => [number, number]) & ((parallels: [number, number]) => this)
}

export function isConicProjection(
  projection: GeoProjection,
): projection is GeoConicProjection {
  return typeof (projection as any).parallels === 'function'
}

/**
 * Factory function return type for conic projections.
 */
export type ConicProjectionFactory = () => GeoConicProjection
