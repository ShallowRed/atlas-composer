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
import * as d3CompositeProjEurope from 'd3-composite-projections/src/conicConformalEurope.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjections from 'd3-composite-projections/src/conicConformalFrance.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjPortugal from 'd3-composite-projections/src/conicConformalPortugal.js'
import * as d3Geo from 'd3-geo'
import * as d3GeoProjection from 'd3-geo-projection'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionStrategy } from '@/core/projections/types'

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
      console.error('[ProjectionFactory] Invalid options: projection is required')
      return null
    }

    const { projection, parameters = {} } = options

    // Get projection definition
    let definition: ProjectionDefinition | undefined
    if (typeof projection === 'string') {
      definition = projectionRegistry.get(projection)
      if (!definition) {
        console.error(`[ProjectionFactory] Unknown projection: ${projection}`)
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
        console.error(
          `[ProjectionFactory] Unknown strategy: ${definition.strategy}`,
        )
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

  /**
   * Create a D3 built-in projection (from d3-geo)
   */
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

      default:
        console.error(`[ProjectionFactory] Unknown D3 builtin: ${id}`)
        return null
    }

    const projection = projectionFn()
    return this.applyParameters(projection, params)
  }

  /**
   * Create an extended D3 projection (from d3-geo-projection)
   */
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
      case 'natural-earth':
      case 'natural-earth1':
        projectionFn = () => d3GeoProjection.geoNaturalEarth1()
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

      // Polyhedral
      case 'polyhedral-waterman':
        projectionFn = () => d3GeoProjection.geoPolyhedralWaterman()
        break

      default:
        console.error(`[ProjectionFactory] Unknown D3 extended: ${id}`)
        return null
    }

    const projection = projectionFn()
    return this.applyParameters(projection, params)
  }

  /**
   * Create a composite projection (from d3-composite-projections)
   */
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

      case 'conic-conformal-europe':
      case 'europe-composite':
      case 'composite-europe':
      case 'eu-composite':
      case 'composite-eu':
        projectionFn = d3CompositeProjEurope.default
        break

      default:
        console.error(`[ProjectionFactory] Unknown composite projection: ${id}`)
        return null
    }

    if (!projectionFn) {
      console.error(`[ProjectionFactory] Projection function is null for: ${id}`)
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

    // Apply translation
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
