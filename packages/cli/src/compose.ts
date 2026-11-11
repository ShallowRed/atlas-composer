/// <reference path="./d3-geo-projection.d.ts" />
import type { Position, TerritoryFeature } from '@atlas-composer/preset-library'
import type { ProjectionLoader } from '@atlas-composer/projection-loader'
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { GeoStream } from 'd3-geo'
import type { GeoJsonTerritories, GeoJsonTerritory } from './geojson.js'
import { rewindToRfc7946 } from '@atlas-composer/preset-library'
import { geoClipRectangle } from 'd3-geo'
import { geoProject } from 'd3-geo-projection'
import { mapPositions } from './geojson.js'

export interface ComposedTerritories {
  /** The territories placed in the composition, in longitudes and latitudes that a Web Mercator display draws as the composition */
  collection: GeoJsonTerritories
  canvasDimensions: { width: number, height: number }
  referenceScale: number
  /** Codes of the territories that the composite configuration leaves out */
  skippedCodes: string[]
  /** Codes of the territories that their frame or the canvas clips entirely */
  emptyCodes: string[]
}

const DEGREES = 180 / Math.PI

/**
 * Places each territory in the composition through the sub-projection of its code, clipped to its frame and to the
 * canvas, then converts the plane of the composition to longitudes and latitudes by the inverse of Web Mercator.
 */
export function composeTerritories(
  loader: ProjectionLoader,
  config: CompositeProjectionConfig,
  territories: { features: ReadonlyArray<TerritoryFeature> },
): ComposedTerritories {
  const { referenceScale, canvasDimensions: { width, height } } = config
  const subProjections = loader.createSubProjections(config, { scale: referenceScale, translate: [width / 2, height / 2] })
  const clipToCanvas = geoClipRectangle(0, 0, width, height)

  // The longer side of the canvas spans the 360° of longitude
  const k = 2 * Math.PI / Math.max(width, height)
  const toLongitudeLatitude = ([x, y]: Position): Position => [
    (x! - width / 2) * k * DEGREES,
    (2 * Math.atan(Math.exp((height / 2 - y!) * k)) - Math.PI / 2) * DEGREES,
  ]

  const features: GeoJsonTerritory[] = []
  const skippedCodes: string[] = []
  const emptyCodes: string[] = []

  for (const territory of territories.features) {
    const { code } = territory.properties
    const subProjection = subProjections.get(code)
    if (!subProjection) {
      skippedCodes.push(code)
      continue
    }
    const stream = (output: GeoStream) => subProjection.stream!(clipToCanvas(output)) as GeoStream
    const { geometry } = geoProject(territory, { stream })
    if (!geometry) {
      emptyCodes.push(code)
      continue
    }
    features.push({
      type: 'Feature',
      properties: territory.properties,
      geometry: rewindToRfc7946(mapPositions(geometry, toLongitudeLatitude)),
    })
  }

  return {
    collection: { type: 'FeatureCollection', features },
    canvasDimensions: { width, height },
    referenceScale,
    skippedCodes,
    emptyCodes,
  }
}
