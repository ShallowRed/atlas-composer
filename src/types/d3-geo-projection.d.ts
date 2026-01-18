declare module 'd3-geo-projection' {
  import type { GeoProjection } from 'd3-geo'

  export function geoWinkel3(): GeoProjection
  export function geoRobinson(): GeoProjection
  export function geoBertin1953(): GeoProjection

  export function geoMiller(): GeoProjection

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

  export function geoAitoff(): GeoProjection
  export function geoHammer(): GeoProjection

  export function geoArmadillo(): GeoProjection
  export function geoLoximuthal(): GeoProjection

  export function geoPolyhedralWaterman(): GeoProjection
  export function geoPolyhedralButterfly(): GeoProjection
}
