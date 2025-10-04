import type { GeoProjection } from 'd3-geo'
import * as Plot from '@observablehq/plot'

/**
 * Crée un plot Observable Plot pour visualiser une projection avec des données géographiques
 */
export function plotCartography(
  geoData: GeoJSON.FeatureCollection,
  regions: Array<{ name: string, code: string }>,
  projection: GeoProjection,
): HTMLElement | SVGSVGElement {
  return Plot.plot({
    projection,
    width: 975,
    height: 610,
    style: {
      backgroundColor: 'transparent',
    },
    marks: [
      Plot.geo(geoData, {
        fill: (d: any) => d.properties?.REG || 'unknown',
        stroke: '#fff',
        strokeWidth: 1,
        tip: true,
        title: (d: any) => {
          const regCode = d.properties?.REG
          const region = regions.find(r => r.code === regCode)
          return region ? region.name : regCode
        },
      }),
    ],
  })
}
