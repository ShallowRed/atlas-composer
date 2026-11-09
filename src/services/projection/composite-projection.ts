import type { ProjectionLike, SubProjectionEntry } from '@atlas-composer/projection-core'
import type { GeoProjection } from 'd3-geo'

import type { CompositeProjectionConfig } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'

import { applyRenderingParameters, boundsFromArray, buildCompositeProjection } from '@atlas-composer/projection-core'
import { DEFAULT_REFERENCE_SCALE } from '@atlas-composer/specification'
import { applyPositioning } from '@/core/positioning'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { ProjectionFactory } from '@/core/projections/factory'
import { isConicProjection } from '@/types/d3-geo-extended'
import { logger } from '@/utils/logger'

const debug = logger.projection.composite

// Removes the floating-point noise of the d3 accessors (-3.0000000000000004)
function roundApplied<T extends number[]>(values: T): T {
  return values.map(value => Math.round(value * 1e9) / 1e9) as T
}

interface SubProjectionConfig {
  territoryCode: TerritoryCode
  territoryName: string
  projection: GeoProjection
  projectionType: ProjectionId
  translateOffset: [number, number]
  bounds?: [[number, number], [number, number]]
}

export class CompositeProjection {
  private subProjections: SubProjectionConfig[]
  private config: CompositeProjectionConfig
  private parameterProvider: ProjectionParameterProvider
  private referenceScale?: number

  constructor(config: CompositeProjectionConfig, parameterProvider: ProjectionParameterProvider, referenceScale?: number) {
    this.config = config
    this.parameterProvider = parameterProvider
    this.referenceScale = referenceScale
    this.subProjections = this.readSubProjections()
  }

  private readSubProjections(): SubProjectionConfig[] {
    const referenceScale = this.referenceScale ?? DEFAULT_REFERENCE_SCALE

    return this.config.territories.flatMap((territory) => {
      const territoryCode = territory.code as TerritoryCode
      const parameters = this.parameterProvider.getEffectiveParameters(territoryCode)

      if (!parameters.projectionId) {
        debug('Skipping territory %s - not defined in preset (projectionId missing)', territory.code)
        return []
      }

      const projection = this.createProjectionByType(parameters.projectionId).translate([0, 0])
      applyPositioning(projection, parameters, 'composite')
      projection.scale(referenceScale * (parameters.scaleMultiplier ?? 1))

      return [{
        territoryCode,
        territoryName: territory.name,
        projection,
        projectionType: parameters.projectionId as ProjectionId,
        translateOffset: parameters.translateOffset ?? [0, 0],
        bounds: territory.bounds,
      }]
    })
  }

  private createProjectionByType(projectionType: string): GeoProjection {
    const projection = ProjectionFactory.createById(projectionType)
    if (projection) {
      return projection
    }

    debug('Failed to create projection: %s, falling back to Mercator', projectionType)
    return ProjectionFactory.createById(FALLBACK_PROJECTION_ID)!
  }

  updateReferenceScale(newReferenceScale: number): void {
    this.referenceScale = newReferenceScale
  }

  build(width = 800, height = 600): GeoProjection {
    const subProjections = this.readSubProjections()

    // The parameters are empty during a load, and the composite of an empty list throws
    if (subProjections.length > 0) {
      this.subProjections = subProjections
      subProjections.forEach(subProjection => this.placeSubProjection(subProjection, width, height))
    }

    const entries: SubProjectionEntry[] = this.subProjections.map(subProj => ({
      id: subProj.territoryCode,
      name: subProj.territoryName,
      projection: subProj.projection as unknown as ProjectionLike,
      bounds: subProj.bounds && boundsFromArray(subProj.bounds),
    }))

    return buildCompositeProjection({ entries }) as any
  }

  private placeSubProjection({ territoryCode, projection, translateOffset, bounds }: SubProjectionConfig, width: number, height: number) {
    const translate: [number, number] = [width / 2 + translateOffset[0], height / 2 + translateOffset[1]]
    projection.translate(translate)

    const { clipAngle, precision, pixelClipExtent } = this.parameterProvider.getEffectiveParameters(territoryCode)
    applyRenderingParameters(
      projection as unknown as ProjectionLike,
      { clipAngle, precision, pixelClipExtent, bounds: bounds && boundsFromArray(bounds) },
      translate,
    )
  }

  getCompositionBorders(_width = 800, _height = 600): Array<{
    territoryCode: string
    territoryName: string
    bounds: [[number, number], [number, number]]
  }> {
    return this.subProjections
      .filter(sp => sp.bounds)
      .map((subProj) => {
        const currentClipExtent = subProj.projection.clipExtent?.()
        if (currentClipExtent) {
          return {
            territoryCode: subProj.territoryCode,
            territoryName: subProj.territoryName,
            bounds: [
              [currentClipExtent[0][0], currentClipExtent[0][1]],
              [currentClipExtent[1][0], currentClipExtent[1][1]],
            ] as [[number, number], [number, number]],
          }
        }

        if (!subProj.bounds)
          return null

        const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds

        const topLeft = subProj.projection([minLon, maxLat])
        const bottomRight = subProj.projection([maxLon, minLat])

        if (!topLeft || !bottomRight)
          return null

        return {
          territoryCode: subProj.territoryCode,
          territoryName: subProj.territoryName,
          bounds: [
            topLeft as [number, number],
            bottomRight as [number, number],
          ] as [[number, number], [number, number]],
        }
      })
      .filter(Boolean) as Array<{
      territoryCode: string
      territoryName: string
      bounds: [[number, number], [number, number]]
    }>
  }

  exportConfig() {
    return {
      subProjections: this.readSubProjections().map(sp => ({
        territoryCode: sp.territoryCode,
        territoryName: sp.territoryName,
        projectionType: sp.projectionType,
        ...this.parameterProvider.getExportableParameters(sp.territoryCode),
        ...this.getAppliedPositioning(sp.projection),
        translateOffset: sp.translateOffset,
        bounds: sp.bounds,
      })),
    }
  }

  private getAppliedPositioning(projection: GeoProjection): Pick<ProjectionParameters, 'center' | 'rotate' | 'parallels'> {
    return {
      rotate: roundApplied(projection.rotate()),
      center: roundApplied(projection.center()),
      parallels: isConicProjection(projection) ? roundApplied(projection.parallels()) : undefined,
    }
  }

  getSubProjectionData(territoryCode: string): {
    projection: GeoProjection
    bounds?: [[number, number], [number, number]]
    scale: number
  } | undefined {
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (!subProj) {
      return undefined
    }

    return {
      projection: subProj.projection,
      bounds: subProj.bounds,
      scale: subProj.projection.scale(),
    }
  }

  getAllSubProjectionData(): Array<{
    territoryCode: string
    projection: GeoProjection
    bounds?: [[number, number], [number, number]]
    scale: number
  }> {
    return this.subProjections.map(subProj => ({
      territoryCode: subProj.territoryCode,
      projection: subProj.projection,
      bounds: subProj.bounds,
      scale: subProj.projection.scale(),
    }))
  }
}
