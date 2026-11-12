import type { CompositeProjectionConfig, NeutralComposite, PROJECTION_CATALOG } from '@atlas-composer/specification'
import type { GeoConicProjection } from 'd3-geo'
import { resolveProjectionAlias } from '@atlas-composer/specification'
import { geoRotation } from 'd3-geo'
import { d3ProjectionFactories } from './d3-projection-helpers'
import { ProjectionLoader } from './projection-loader'

type NeutralTerritory = NeutralComposite['territories'][number]

/**
 * What follows `+proj=` or `+o_proj=` for the d3-geo factory that `d3ProjectionFactories`
 * registers under each identifier, on a sphere of radius 1
 */
const PROJ_OPERATIONS = {
  'azimuthal-equal-area': 'laea',
  'azimuthal-equidistant': 'aeqd',
  'gnomonic': 'gnom',
  'orthographic': 'ortho',
  // The raw stereographic projection of d3-geo is half the one of PROJ
  'stereographic': 'stere +k_0=0.5',
  'conic-conformal': 'lcc',
  'conic-equal-area': 'aea',
  'conic-equidistant': 'eqdc',
  'mercator': 'merc',
  'transverse-mercator': 'tmerc',
  'equirectangular': 'eqc',
  'natural-earth': 'natearth',
  'equal-earth': 'eqearth',
} satisfies Record<keyof typeof PROJECTION_CATALOG, string>

const RADIANS = Math.PI / 180

// Below this value, d3-geo replaces a conic projection with a cylindrical one, and PROJ refuses the parallels
const SYMMETRIC_PARALLELS_EPSILON = 1e-6

function round(value: number): number {
  // + 0 writes -0 as 0
  return Number(value.toFixed(12)) + 0
}

function normalizeLongitude(degrees: number): number {
  return degrees > 180 ? degrees - 360 : degrees <= -180 ? degrees + 360 : degrees
}

/** The projection step: d3-geo sends the point [-λ, -φ] to the origin of the raw projection */
function projectionStep(operation: string, [lambda, phi, gamma]: [number, number, number], parallels: string): string {
  if (phi === 0 && gamma === 0) {
    return `+proj=${operation} +lon_0=${round(-lambda)}${parallels} +R=1`
  }

  const [poleLongitude, poleLatitude] = geoRotation([lambda, phi, gamma]).invert([0, 90])
  const centralMeridian = normalizeLongitude(poleLongitude - 180)

  // Longitude of the origin in the rotated frame of ob_tran, which o_lon_p brings back to 0
  const originLongitude = (-lambda - centralMeridian) * RADIANS
  const originLatitude = -phi * RADIANS
  const rotatedLongitude = Math.atan2(
    Math.cos(originLatitude) * Math.sin(originLongitude),
    Math.sin(poleLatitude * RADIANS) * Math.cos(originLatitude) * Math.cos(originLongitude)
    + Math.cos(poleLatitude * RADIANS) * Math.sin(originLatitude),
  )

  return `+proj=ob_tran +o_proj=${operation}`
    + ` +o_lon_p=${round(normalizeLongitude(-rotatedLongitude / RADIANS))}`
    + ` +o_lat_p=${round(poleLatitude)} +lon_0=${round(centralMeridian)}${parallels} +R=1`
}

/**
 * Describes each territory of a composite by a PROJ pipeline, from longitudes and latitudes
 * in degrees to the pixels of the canvas, and by the ring of its frame cut to the canvas.
 * The pipelines describe the sub-projections built with `d3ProjectionFactories`.
 */
export function describeComposite(config: CompositeProjectionConfig): NeutralComposite {
  const loader = new ProjectionLoader()
  loader.registerAll(d3ProjectionFactories)

  const { referenceScale, canvasDimensions } = config
  const { width, height } = canvasDimensions
  const subProjections = loader.createSubProjections(config, {
    scale: referenceScale,
    translate: [width / 2, height / 2],
  })

  const description: NeutralComposite = {
    canvasDimensions,
    referenceScale,
    territories: [],
    unsupported: [],
    emptyClipCodes: [],
  }

  for (const territory of config.territories) {
    const { code } = territory
    // The factories of d3ProjectionFactories return d3-geo projections; parallels exists on the conic ones
    const sub = subProjections.get(code) as unknown as GeoConicProjection

    const [[left, top], [right, bottom]] = sub.clipExtent() ?? [[0, 0], [width, height]]
    const x0 = round(Math.max(left, 0))
    const y0 = round(Math.max(top, 0))
    const x1 = round(Math.min(right, width))
    const y1 = round(Math.min(bottom, height))
    if (x1 <= x0 || y1 <= y0) {
      description.emptyClipCodes.push(code)
      continue
    }

    let parallels = ''
    if (typeof sub.parallels === 'function') {
      const [first, second] = sub.parallels()
      if (Math.abs(Math.sin(first * RADIANS) + Math.sin(second * RADIANS)) / 2 < SYMMETRIC_PARALLELS_EPSILON) {
        description.unsupported.push({ code, reason: 'symmetric-parallels' })
        continue
      }
      parallels = ` +lat_1=${round(first)} +lat_2=${round(second)}`
    }

    const operation = PROJ_OPERATIONS[resolveProjectionAlias(territory.projection.id) as keyof typeof PROJ_OPERATIONS]
    const rotate = sub.rotate()
    const scale = round(sub.scale())
    const [xOffset, yOffset] = sub([-rotate[0], -rotate[1]])!

    const described: NeutralTerritory = {
      code,
      pipeline: '+proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad'
        + ` +step ${projectionStep(operation, rotate, parallels)}`
        + ` +step +proj=affine +s11=${scale} +s22=${round(-scale)} +xoff=${round(xOffset)} +yoff=${round(yOffset)}`,
      clip: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]],
    }
    if (territory.bounds) {
      described.bounds = territory.bounds
    }
    description.territories.push(described)
  }

  return description
}
