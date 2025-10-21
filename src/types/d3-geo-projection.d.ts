/**
 * Type declarations for d3-geo-projection
 *
 * Type definitions for D3 extended projection library.
 * Includes all projections used in the application.
 */

declare module 'd3-geo-projection' {
  import type { GeoProjection } from 'd3-geo'

  // Extended projections from d3-geo-projection library only
  // (projections from d3-geo core are already typed via @types/d3-geo)

  // Compromise projections
  export function geoWinkel3(): GeoProjection
  export function geoRobinson(): GeoProjection
  export function geoBertin1953(): GeoProjection

  // Cylindrical projections
  export function geoMiller(): GeoProjection

  // Pseudocylindrical projections
  export function geoMollweide(): GeoProjection
  export function geoSinusoidal(): GeoProjection
  export function geoBonne(): GeoProjection
  export function geoEckert1(): GeoProjection
  export function geoEckert2(): GeoProjection
  export function geoEckert3(): GeoProjection
  export function geoEckert4(): GeoProjection
  export function geoEckert5(): GeoProjection
  export function geoEckert6(): GeoProjection
  export function geoWagner6(): GeoProjection

  // Lenticular projections
  export function geoAitoff(): GeoProjection
  export function geoHammer(): GeoProjection

  // Artistic projections
  export function geoArmadillo(): GeoProjection
  export function geoLoximuthal(): GeoProjection

  // Polyhedral projections
  export function geoPolyhedralWaterman(): GeoProjection
  export function geoPolyhedralButterfly(): GeoProjection
}
