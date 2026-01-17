/**
 * Projection Factory
 *
 * Creates D3 projection instances based on projection definitions.
 * Implements the Strategy pattern to handle different projection sources
 * (D3 built-in, d3-geo-projection, d3-composite-projections).
 */

import type { GeoProjection } from 'd3-geo'
import type {
  CreateProjectionOptions,
  D3ProjectionFunction,
  ProjectionDefinition,
  ProjectionParameters,
} from '@/core/projections/types'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjUK from 'd3-composite-projections/src/albersUk.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjAlbersUsa from 'd3-composite-projections/src/albersUsa.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjAlbersUsaTerritories from 'd3-composite-projections/src/albersUsaTerritories.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjEurope from 'd3-composite-projections/src/conicConformalEurope.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjections from 'd3-composite-projections/src/conicConformalFrance.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjNetherlands from 'd3-composite-projections/src/conicConformalNetherlands.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjPortugal from 'd3-composite-projections/src/conicConformalPortugal.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjSpain from 'd3-composite-projections/src/conicConformalSpain.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjJapan from 'd3-composite-projections/src/conicEquidistantJapan.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjEcuador from 'd3-composite-projections/src/mercatorEcuador.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjEquatorialGuinea from 'd3-composite-projections/src/mercatorEquatorialGuinea.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjMalaysia from 'd3-composite-projections/src/mercatorMalaysia.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjChile from 'd3-composite-projections/src/transverseMercatorChile.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjDenmark from 'd3-composite-projections/src/transverseMercatorDenmark.js'
import * as d3Geo from 'd3-geo'
import * as d3GeoProjection from 'd3-geo-projection'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionStrategy } from '@/core/projections/types'
import { logger } from '@/utils/logger'

const debug = logger.projection.factory

/**
 * Projection Factory Class
 *
 * Creates D3 projection instances using the Strategy pattern to handle different
 * projection sources (D3 built-in, d3-geo-projection, d3-composite-projections).
 */
export class ProjectionFactory {
  /**
   * Create a projection instance from a definition or ID
   *
   * @param options - Projection creation options
   * @param options.projection - Projection definition object or ID string
   * @param options.parameters - Optional projection parameters (center, rotate, scale, etc.)
   * @returns Configured D3 projection instance, or null if creation fails
   */
  public static create(options: CreateProjectionOptions): GeoProjection | null {
    // Validate options
    if (!options || !options.projection) {
      debug('Invalid options: projection is required')
      return null
    }

    const { projection, parameters = {} } = options

    // Get projection definition
    let definition: ProjectionDefinition | undefined
    if (typeof projection === 'string') {
      definition = projectionRegistry.get(projection)
      if (!definition) {
        debug('Unknown projection: %s', projection)
        return null
      }
    }
    else {
      definition = projection
    }

    // Merge default parameters with overrides
    const finalParams: ProjectionParameters = {
      ...definition.defaultParameters,
      ...parameters,
    }

    // Create projection based on strategy
    switch (definition.strategy) {
      case ProjectionStrategy.D3_BUILTIN:
        return this.createD3Builtin(definition.id, finalParams)

      case ProjectionStrategy.D3_EXTENDED:
        return this.createD3Extended(definition.id, finalParams)

      case ProjectionStrategy.D3_COMPOSITE:
        return this.createD3Composite(definition.id, finalParams)

      default:
        debug('Unknown strategy: %s', definition.strategy)
        return null
    }
  }

  /**
   * Create projection by ID (convenience method)
   *
   * A simpler alternative to `create()` when you only have a projection ID.
   *
   * @param id - Projection ID (e.g., 'mercator', 'conic-conformal')
   * @param parameters - Optional projection parameters
   * @returns Configured D3 projection instance, or null if ID is invalid
   */
  public static createById(
    id: string,
    parameters?: ProjectionParameters,
  ): GeoProjection | null {
    return this.create({ projection: id, parameters })
  }

    private static createD3Builtin(
    id: string,
    params: ProjectionParameters,
  ): GeoProjection | null {
    let projectionFn: D3ProjectionFunction | null = null

    // Map projection IDs to D3 functions
    switch (id) {
      // Conic
      case 'conic-conformal':
        projectionFn = d3Geo.geoConicConformal
        break
      case 'conic-equal-area':
      case 'albers':
        projectionFn = d3Geo.geoConicEqualArea
        break
      case 'conic-equidistant':
        projectionFn = d3Geo.geoConicEquidistant
        break

      // Azimuthal
      case 'azimuthal-equal-area':
        projectionFn = d3Geo.geoAzimuthalEqualArea
        break
      case 'azimuthal-equidistant':
        projectionFn = d3Geo.geoAzimuthalEquidistant
        break
      case 'orthographic':
        projectionFn = d3Geo.geoOrthographic
        break
      case 'stereographic':
        projectionFn = d3Geo.geoStereographic
        break
      case 'gnomonic':
        projectionFn = d3Geo.geoGnomonic
        break

      // Cylindrical
      case 'mercator':
        projectionFn = d3Geo.geoMercator
        break
      case 'transverse-mercator':
        projectionFn = d3Geo.geoTransverseMercator
        break
      case 'equirectangular':
        projectionFn = d3Geo.geoEquirectangular
        break

      // World
      case 'equal-earth':
        projectionFn = d3Geo.geoEqualEarth
        break
      case 'natural-earth':
      case 'natural-earth1':
        projectionFn = d3Geo.geoNaturalEarth1
        break

      default:
        debug('Unknown D3 builtin: %s', id)
        return null
    }

    const projection = projectionFn()
    return this.applyParameters(projection, params)
  }

    private static createD3Extended(
    id: string,
    params: ProjectionParameters,
  ): GeoProjection | null {
    let projectionFn: D3ProjectionFunction | null = null

    // Map projection IDs to d3-geo-projection functions
    switch (id) {
      // Conic
      case 'bonne':
        projectionFn = () => d3GeoProjection.geoBonne()
        break

      // Cylindrical
      case 'miller':
        projectionFn = () => d3GeoProjection.geoMiller()
        break

      // World/Pseudocylindrical
      case 'mollweide':
        projectionFn = () => d3GeoProjection.geoMollweide()
        break
      case 'sinusoidal':
        projectionFn = () => d3GeoProjection.geoSinusoidal()
        break
      case 'eckert1':
        projectionFn = () => d3GeoProjection.geoEckert1()
        break
      case 'eckert2':
        projectionFn = () => d3GeoProjection.geoEckert2()
        break
      case 'eckert3':
        projectionFn = () => d3GeoProjection.geoEckert3()
        break
      case 'eckert4':
        projectionFn = () => d3GeoProjection.geoEckert4()
        break
      case 'eckert5':
        projectionFn = () => d3GeoProjection.geoEckert5()
        break
      case 'eckert6':
        projectionFn = () => d3GeoProjection.geoEckert6()
        break
      case 'wagner6':
      case 'wagner-vi':
        projectionFn = () => d3GeoProjection.geoWagner6()
        break

      // Compromise
      case 'robinson':
        projectionFn = () => d3GeoProjection.geoRobinson()
        break
      case 'winkel3':
      case 'winkel-tripel':
        projectionFn = () => d3GeoProjection.geoWinkel3()
        break

      // Artistic
      case 'aitoff':
        projectionFn = () => d3GeoProjection.geoAitoff()
        break
      case 'hammer':
        projectionFn = () => d3GeoProjection.geoHammer()
        break
      case 'bertin1953':
        projectionFn = () => d3GeoProjection.geoBertin1953()
        break
      case 'armadillo':
        projectionFn = () => d3GeoProjection.geoArmadillo()
        break
      case 'loximuthal':
        projectionFn = () => d3GeoProjection.geoLoximuthal()
        break

      // Polyhedral
      case 'polyhedral-waterman':
        projectionFn = () => d3GeoProjection.geoPolyhedralWaterman()
        break
      case 'polyhedral-butterfly':
        projectionFn = () => d3GeoProjection.geoPolyhedralButterfly()
        break

      default:
        debug('Unknown D3 extended: %s', id)
        return null
    }

    const projection = projectionFn()
    return this.applyParameters(projection, params)
  }

    private static createD3Composite(
    id: string,
    params: ProjectionParameters,
  ): GeoProjection | null {
    let projectionFn: D3ProjectionFunction | null = null

    // Map projection IDs to d3-composite-projections factory functions
    switch (id) {
      case 'conic-conformal-france':
      case 'france-composite':
      case 'composite-france':
        projectionFn = d3CompositeProjections.default
        break

      case 'conic-conformal-portugal':
      case 'portugal-composite':
      case 'composite-portugal':
        projectionFn = d3CompositeProjPortugal.default
        break

      case 'conic-conformal-spain':
      case 'spain-composite':
      case 'composite-spain':
        projectionFn = d3CompositeProjSpain.default
        break

      case 'conic-conformal-europe':
      case 'europe-composite':
      case 'composite-europe':
        projectionFn = d3CompositeProjEurope.default
        break

      case 'albers-usa':
        // Use D3's built-in geoAlbersUsa (native)
        projectionFn = d3Geo.geoAlbersUsa
        break

      case 'albers-usa-composite':
      case 'usa-composite':
        // Use d3-composite-projections albersUsa
        projectionFn = d3CompositeProjAlbersUsa.default
        break

      case 'albers-usa-territories':
      case 'usa-territories':
        // Use d3-composite-projections albersUsaTerritories
        projectionFn = d3CompositeProjAlbersUsaTerritories.default
        break

      case 'conic-conformal-netherlands':
      case 'netherlands-composite':
      case 'composite-netherlands':
        projectionFn = d3CompositeProjNetherlands.default
        break

      case 'conic-equidistant-japan':
      case 'japan-composite':
      case 'composite-japan':
        projectionFn = d3CompositeProjJapan.default
        break

      case 'mercator-ecuador':
      case 'ecuador-composite':
      case 'composite-ecuador':
        projectionFn = d3CompositeProjEcuador.default
        break

      case 'transverse-mercator-chile':
      case 'chile-composite':
      case 'composite-chile':
        projectionFn = d3CompositeProjChile.default
        break

      case 'mercator-malaysia':
      case 'malaysia-composite':
      case 'composite-malaysia':
        projectionFn = d3CompositeProjMalaysia.default
        break

      case 'mercator-equatorial-guinea':
      case 'equatorial-guinea-composite':
      case 'composite-equatorial-guinea':
        projectionFn = d3CompositeProjEquatorialGuinea.default
        break

      case 'albers-uk':
      case 'uk-composite':
      case 'composite-uk':
      case 'united-kingdom-composite':
        projectionFn = d3CompositeProjUK.default
        break

      case 'transverse-mercator-denmark':
      case 'denmark-composite':
      case 'composite-denmark':
        projectionFn = d3CompositeProjDenmark.default
        break

      default:
        debug('Unknown composite projection: %s', id)
        return null
    }

    if (!projectionFn) {
      debug('Projection function is null for: %s', id)
      return null
    }

    const projection = projectionFn()
    // Note: Composite projections handle their own internal parameters
    // We only apply top-level parameters like scale and translate
    return this.applyParameters(projection, params, true)
  }

  /**
   * Apply parameters to a projection instance
   */
  private static applyParameters(
    projection: GeoProjection,
    params: ProjectionParameters,
    compositeMode = false,
  ): GeoProjection {
    // Apply center
    if (params.center && !compositeMode) {
      projection.center(params.center)
    }

    // Apply rotation
    if (params.rotate && !compositeMode) {
      // Ensure rotate is either [number, number] or [number, number, number]
      const rotate = params.rotate.length === 3 && params.rotate[2] !== undefined
        ? params.rotate as [number, number, number]
        : [params.rotate[0], params.rotate[1]] as [number, number]
      projection.rotate(rotate)
    }

    // Apply parallels (for conic projections)
    if (params.parallels && 'parallels' in projection && !compositeMode) {
      ;(projection as any).parallels(params.parallels)
    }

    // Apply scale
    if (params.scale) {
      projection.scale(params.scale)
    }

    // Apply translate (pixel offset for projection center)
    if (params.translate) {
      projection.translate(params.translate)
    }

    // Apply clip angle (for azimuthal projections)
    if (params.clipAngle && 'clipAngle' in projection) {
      ;(projection as any).clipAngle(params.clipAngle)
    }

    // Apply precision
    if (params.precision !== undefined) {
      projection.precision(params.precision)
    }

    return projection
  }
}
