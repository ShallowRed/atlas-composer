import type { GeoProjection } from 'd3-geo'
import type {
  CreateProjectionOptions,
  ProjectionDefinition,
  ProjectionParameters,
} from '@/core/projections/types'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionStrategy } from '@/core/projections/types'
import { logger } from '@/utils/logger'

const debug = logger.projection.factory

export class ProjectionFactory {
  public static create(options: CreateProjectionOptions): GeoProjection | null {
    if (!options || !options.projection) {
      debug('Invalid options: projection is required')
      return null
    }

    const { projection, parameters = {} } = options

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

    const finalParams: ProjectionParameters = {
      ...definition.defaultParameters,
      ...parameters,
    }

    return this.applyParameters(
      definition.create(),
      finalParams,
      definition.strategy === ProjectionStrategy.D3_COMPOSITE,
    )
  }

  public static createById(
    id: string,
    parameters?: ProjectionParameters,
  ): GeoProjection | null {
    return this.create({ projection: id, parameters })
  }

  private static applyParameters(
    projection: GeoProjection,
    params: ProjectionParameters,
    compositeMode: boolean,
  ): GeoProjection {
    if (params.center && !compositeMode) {
      projection.center(params.center)
    }

    if (params.rotate && !compositeMode) {
      const rotate = params.rotate.length === 3 && params.rotate[2] !== undefined
        ? params.rotate as [number, number, number]
        : [params.rotate[0], params.rotate[1]] as [number, number]
      projection.rotate(rotate)
    }

    if (params.parallels && 'parallels' in projection && !compositeMode) {
      ;(projection as any).parallels(params.parallels)
    }

    if (params.scale) {
      projection.scale(params.scale)
    }

    if (params.translate) {
      projection.translate(params.translate)
    }

    if (params.clipAngle && 'clipAngle' in projection) {
      ;(projection as any).clipAngle(params.clipAngle)
    }

    if (params.precision !== undefined) {
      projection.precision(params.precision)
    }

    return projection
  }
}
