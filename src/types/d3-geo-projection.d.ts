/**
 * Type declarations for d3-geo-projection
 *
 * Type definitions for D3 extended projection library.
 * Includes all projections used in the application.
 */

declare module 'd3-geo-projection' {
  import type { GeoProjection } from 'd3-geo'

  // Basic projections
  export function geoAlbers(): GeoProjection
  export function geoConicConformal(): GeoProjection
  export function geoMercator(): GeoProjection
  export function geoEquirectangular(): GeoProjection

  // Azimuthal projections
  export function geoAzimuthalEqualArea(): GeoProjection
  export function geoAzimuthalEquidistant(): GeoProjection
  export function geoOrthographic(): GeoProjection
  export function geoStereographic(): GeoProjection

  // Compromise projections
  export function geoNaturalEarth1(): GeoProjection
  export function geoEqualEarth(): GeoProjection
  export function geoWinkel3(): GeoProjection
  export function geoRobinson(): GeoProjection
  export function geoBertin1953(): GeoProjection

  // Cylindrical projections
  export function geoMiller(): GeoProjection

  // Pseudocylindrical projections
  export function geoMollweide(): GeoProjection
  export function geoSinusoidal(): GeoProjection
  export function geoBonne(): GeoProjection

  // Lenticular projections
  export function geoAitoff(): GeoProjection
  export function geoHammer(): GeoProjection

  // Polyhedral projections
  export function geoPolyhedralWaterman(): GeoProjection
}
