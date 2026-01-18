import type { ProjectionFactory } from './standalone-projection-loader'
import * as d3Geo from 'd3-geo'
import * as d3GeoProjection from 'd3-geo-projection'

export const azimuthalEqualArea: ProjectionFactory = () => d3Geo.geoAzimuthalEqualArea()
export const azimuthalEquidistant: ProjectionFactory = () => d3Geo.geoAzimuthalEquidistant()
export const gnomonic: ProjectionFactory = () => d3Geo.geoGnomonic()
export const orthographic: ProjectionFactory = () => d3Geo.geoOrthographic()
export const stereographic: ProjectionFactory = () => d3Geo.geoStereographic()
export const conicConformal: ProjectionFactory = () => d3Geo.geoConicConformal()
export const conicEqualArea: ProjectionFactory = () => d3Geo.geoConicEqualArea()
export const conicEquidistant: ProjectionFactory = () => d3Geo.geoConicEquidistant()
export const albers: ProjectionFactory = () => d3Geo.geoAlbers()
export const mercator: ProjectionFactory = () => d3Geo.geoMercator()
export const transverseMercator: ProjectionFactory = () => d3Geo.geoTransverseMercator()
export const equirectangular: ProjectionFactory = () => d3Geo.geoEquirectangular()
export const naturalEarth1: ProjectionFactory = () => (d3GeoProjection as any).geoNaturalEarth1()
export const equalEarth: ProjectionFactory = () => d3Geo.geoEqualEarth()

export const d3ProjectionFactories: Record<string, ProjectionFactory> = {
  'azimuthal-equal-area': azimuthalEqualArea,
  'azimuthal-equidistant': azimuthalEquidistant,
  'gnomonic': gnomonic,
  'orthographic': orthographic,
  'stereographic': stereographic,
  'conic-conformal': conicConformal,
  'conic-equal-area': conicEqualArea,
  'conic-equidistant': conicEquidistant,
  'albers': albers,
  'mercator': mercator,
  'transverse-mercator': transverseMercator,
  'equirectangular': equirectangular,
  'natural-earth-1': naturalEarth1,
  'equal-earth': equalEarth,
}

export function registerAllD3Projections(
  registerFn: (factories: Record<string, ProjectionFactory>) => void,
): void {
  registerFn(d3ProjectionFactories)
}

export function getAvailableD3Projections(): string[] {
  return Object.keys(d3ProjectionFactories)
}

export default {
  d3ProjectionFactories,
  registerAllD3Projections,
  getAvailableD3Projections,
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
