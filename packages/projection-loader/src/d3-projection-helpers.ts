/**
 * D3 Projection Helpers
 *
 * Optional companion file that provides ready-to-use D3 projection factory mappings.
 * This file has dependencies on d3-geo and d3-geo-projection, but the main loader does not.
 *
 * Users can import this to quickly register all standard D3 projections, or they can
 * selectively import only the projections they need for tree-shaking.
 *
 * @example
 * ```typescript
 * // Register all projections at once
 * import { registerProjections } from './standalone-projection-loader'
 * import { d3ProjectionFactories } from './d3-projection-helpers'
 *
 * registerProjections(d3ProjectionFactories)
 * ```
 *
 * @example
 * ```typescript
 * // Tree-shakeable: import only what you need
 * import { registerProjection } from './standalone-projection-loader'
 * import { mercator, albers } from './d3-projection-helpers'
 *
 * registerProjection('mercator', mercator)
 * registerProjection('albers', albers)
 * ```
 *
 * @packageDocumentation
 */

import type { ProjectionFactory } from './standalone-projection-loader'
import * as d3Geo from 'd3-geo'
import * as d3GeoProjection from 'd3-geo-projection'

// Azimuthal projections
export const azimuthalEqualArea: ProjectionFactory = () => d3Geo.geoAzimuthalEqualArea()
export const azimuthalEquidistant: ProjectionFactory = () => d3Geo.geoAzimuthalEquidistant()
export const gnomonic: ProjectionFactory = () => d3Geo.geoGnomonic()
export const orthographic: ProjectionFactory = () => d3Geo.geoOrthographic()
export const stereographic: ProjectionFactory = () => d3Geo.geoStereographic()

// Conic projections
export const conicConformal: ProjectionFactory = () => d3Geo.geoConicConformal()
export const conicEqualArea: ProjectionFactory = () => d3Geo.geoConicEqualArea()
export const conicEquidistant: ProjectionFactory = () => d3Geo.geoConicEquidistant()
export const albers: ProjectionFactory = () => d3Geo.geoAlbers()

// Cylindrical projections
export const mercator: ProjectionFactory = () => d3Geo.geoMercator()
export const transverseMercator: ProjectionFactory = () => d3Geo.geoTransverseMercator()
export const equirectangular: ProjectionFactory = () => d3Geo.geoEquirectangular()
export const naturalEarth1: ProjectionFactory = () => (d3GeoProjection as any).geoNaturalEarth1()

// Other projections
export const equalEarth: ProjectionFactory = () => d3Geo.geoEqualEarth()

/**
 * Object containing all standard D3 projection factories
 * Keyed by the projection ID used in Atlas composer configurations
 */
export const d3ProjectionFactories: Record<string, ProjectionFactory> = {
  // Azimuthal
  'azimuthal-equal-area': azimuthalEqualArea,
  'azimuthal-equidistant': azimuthalEquidistant,
  'gnomonic': gnomonic,
  'orthographic': orthographic,
  'stereographic': stereographic,

  // Conic
  'conic-conformal': conicConformal,
  'conic-equal-area': conicEqualArea,
  'conic-equidistant': conicEquidistant,
  'albers': albers,

  // Cylindrical
  'mercator': mercator,
  'transverse-mercator': transverseMercator,
  'equirectangular': equirectangular,
  'natural-earth-1': naturalEarth1,

  // Other
  'equal-earth': equalEarth,
}

/**
 * Convenience function to register all D3 projections at once
 *
 * @example
 * ```typescript
 * import { registerProjections } from './standalone-projection-loader'
 * import { registerAllD3Projections } from './d3-projection-helpers'
 *
 * registerAllD3Projections(registerProjections)
 * ```
 *
 * @param registerFn - The registerProjections function from the loader
 */
export function registerAllD3Projections(
  registerFn: (factories: Record<string, ProjectionFactory>) => void,
): void {
  registerFn(d3ProjectionFactories)
}

/**
 * Get list of available D3 projection IDs
 */
export function getAvailableD3Projections(): string[] {
  return Object.keys(d3ProjectionFactories)
}

// Default export
export default {
  d3ProjectionFactories,
  registerAllD3Projections,
  getAvailableD3Projections,

  // Individual projections for tree-shaking
  azimuthalEqualArea,
  azimuthalEquidistant,
  gnomonic,
  orthographic,
  stereographic,
  conicConformal,
  conicEqualArea,
  conicEquidistant,
  albers,
  mercator,
  transverseMercator,
  equirectangular,
  naturalEarth1,
  equalEarth,
}
