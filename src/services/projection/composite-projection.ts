import type { ProjectionLike, SubProjectionEntry } from '@atlas-composer/projection-core'
import type { GeoProjection } from 'd3-geo'

import type { CompositeProjectionConfig } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'

import { buildCompositeProjection, calculateClipExtentFromPixelOffset } from '@atlas-composer/projection-core'
import { DEFAULT_REFERENCE_SCALE } from '@atlas-composer/specification'
import { applyPositioning } from '@/core/positioning'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
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
  baseScale: number
  scaleMultiplier: number
  translateOffset: [number, number]
  bounds?: [[number, number], [number, number]]
}

export class CompositeProjection {
  private subProjections: SubProjectionConfig[] = []
  private compositeProjection: GeoProjection | null = null
  private config: CompositeProjectionConfig
  private parameterProvider?: ProjectionParameterProvider
  private referenceScale?: number

  constructor(config: CompositeProjectionConfig, parameterProvider?: ProjectionParameterProvider, referenceScale?: number) {
    this.config = config
    this.parameterProvider = parameterProvider
    this.referenceScale = referenceScale
    this.initialize()
  }

  private getParametersForTerritory(territoryCode: TerritoryCode): ProjectionParameters {
    return this.parameterProvider?.getEffectiveParameters(territoryCode) ?? {}
  }

  private initialize() {
    this.initializeTerritories()
  }

  private initializeTerritories() {
    const { territories } = this.config

    const REFERENCE_SCALE = this.referenceScale ?? DEFAULT_REFERENCE_SCALE

    territories.forEach((territory) => {
      const territoryParams = this.getParametersForTerritory(territory.code as TerritoryCode)

      if (!territoryParams.projectionId) {
        debug('Skipping territory %s - not defined in preset (projectionId missing)', territory.code)
        return
      }

      const projectionType = territoryParams.projectionId
      const projection = this.createProjectionByType(projectionType)
        .translate([0, 0])

      applyPositioning(projection, territoryParams, 'composite')

      const territoryBaseScale = REFERENCE_SCALE
      const territoryScaleMultiplier = territoryParams.scaleMultiplier ?? 1.0

      projection.scale(territoryBaseScale * territoryScaleMultiplier)

      const territoryTranslateOffset = (territoryParams.translateOffset as [number, number] | undefined) ?? [0, 0]

      this.addSubProjection({
        territoryCode: territory.code as TerritoryCode,
        territoryName: territory.name,
        projection,
        projectionType: projectionType as ProjectionId,
        baseScale: territoryBaseScale,
        scaleMultiplier: territoryScaleMultiplier,
        translateOffset: territoryTranslateOffset,
        bounds: territory.bounds,
      })
    })
  }

  private createProjectionByType(projectionType: string): GeoProjection {
    const projection = ProjectionFactory.createById(projectionType)
    if (projection) {
      return projection
    }

    debug('Failed to create projection: %s, falling back to Mercator', projectionType)
    return ProjectionFactory.createById('mercator')!
  }

  addSubProjection(config: SubProjectionConfig) {
    const existingIndex = this.subProjections.findIndex((sp) => {
      return sp.territoryCode === config.territoryCode
    })

    if (existingIndex >= 0) {
      this.subProjections[existingIndex] = config
    }
    else {
      this.subProjections.push(config)
    }

    this.compositeProjection = null
  }

  updateTerritoryProjection(
    territoryCode: TerritoryCode,
    projectionType: ProjectionId,
  ) {
    const subProj = this.subProjections.find((sp) => {
      return sp.territoryCode === territoryCode
    })
    if (!subProj) {
      return
    }

    const oldDef = projectionRegistry.get(subProj.projectionType)
    const newDef = projectionRegistry.get(projectionType)
    const oldFamily = oldDef?.family || 'MISCELLANEOUS'
    const newFamily = newDef?.family || 'MISCELLANEOUS'
    const familyChanged = oldFamily !== newFamily

    const storeParams = this.getParametersForTerritory(territoryCode)
    const storeScaleMultiplier = storeParams.scaleMultiplier ?? subProj.scaleMultiplier

    const currentScale = subProj.projection.scale()
    const currentTranslate = subProj.projection.translate()
    const oldScaleMultiplier = subProj.scaleMultiplier

    const factoryProjection = ProjectionFactory.createById(projectionType)
    if (!factoryProjection) {
      debug('Failed to create projection: %s', projectionType)
      return
    }

    const newProjection = factoryProjection

    newProjection.translate(currentTranslate)

    subProj.scaleMultiplier = storeScaleMultiplier

    const scaleMultiplierChanged = Math.abs(storeScaleMultiplier - oldScaleMultiplier) > 0.01
    if (familyChanged || scaleMultiplierChanged) {
      const newScale = subProj.baseScale * subProj.scaleMultiplier
      newProjection.scale(newScale)
    }
    else {
      newProjection.scale(currentScale)
    }

    applyPositioning(newProjection, storeParams, 'composite')

    subProj.projection = newProjection
    subProj.projectionType = projectionType

    this.compositeProjection = null
  }

  updateTranslationOffset(territoryCode: TerritoryCode, offset: [number, number]) {
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (subProj) {
      subProj.translateOffset = offset
      this.compositeProjection = null
    }
  }

  updateReferenceScale(newReferenceScale: number): void {
    this.referenceScale = newReferenceScale

    this.subProjections.forEach((subProj) => {
      const referenceScale = this.referenceScale ?? DEFAULT_REFERENCE_SCALE
      const newScale = referenceScale * subProj.scaleMultiplier

      if (typeof subProj.projection.scale === 'function') {
        subProj.projection.scale(newScale)
      }

      subProj.baseScale = referenceScale
    })

    this.compositeProjection = null
  }

  updateTerritoryParameters(territoryCode: TerritoryCode) {
    if (!this.parameterProvider) {
      debug('No parameter provider available for territory %s', territoryCode)
      return
    }

    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (!subProj) {
      debug('Territory %s not found in subprojections', territoryCode)
      return
    }

    const params = this.parameterProvider.getEffectiveParameters(territoryCode)
    const projection = subProj.projection

    if (!projection) {
      return
    }

    applyPositioning(projection, params, 'composite')

    if (params.scaleMultiplier !== undefined && typeof params.scaleMultiplier === 'number' && !Number.isNaN(params.scaleMultiplier)) {
      subProj.scaleMultiplier = params.scaleMultiplier
    }

    const correctScale = subProj.baseScale * subProj.scaleMultiplier
    projection.scale(correctScale)

    if (projection.precision && params.precision !== undefined && typeof params.precision === 'number') {
      projection.precision(params.precision)
    }
    this.compositeProjection = null
  }

  build(width = 800, height = 600, forceRebuild = false): GeoProjection {
    if (this.compositeProjection && !forceRebuild) {
      return this.compositeProjection
    }

    const centerX = width / 2
    const centerY = height / 2

    const epsilon = 1e-6

    this.subProjections.forEach((subProj) => {
      const parameterProvider = this.parameterProvider
      let translateOffset: [number, number] = subProj.translateOffset
      if (parameterProvider) {
        const params = parameterProvider.getEffectiveParameters(subProj.territoryCode)
        if (params.translateOffset) {
          translateOffset = params.translateOffset as [number, number]
        }
      }

      const newTranslate: [number, number] = [
        centerX + translateOffset[0],
        centerY + translateOffset[1],
      ]
      subProj.projection.translate(newTranslate)

      if (parameterProvider) {
        const params = parameterProvider.getEffectiveParameters(subProj.territoryCode)
        if (params.pixelClipExtent && Array.isArray(params.pixelClipExtent) && params.pixelClipExtent.length === 4) {
          const territoryCenter = newTranslate

          const clipExtentScreen = calculateClipExtentFromPixelOffset(
            territoryCenter,
            params.pixelClipExtent as [number, number, number, number],
          )

          subProj.projection.clipExtent(clipExtentScreen)
        }
      }
      if (!parameterProvider || !parameterProvider.getEffectiveParameters(subProj.territoryCode).pixelClipExtent) {
        if (subProj.bounds) {
          const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds

          const topLeft = subProj.projection([minLon + epsilon, maxLat - epsilon])
          const bottomRight = subProj.projection([maxLon - epsilon, minLat + epsilon])

          if (topLeft && bottomRight) {
            const clipExtent: [[number, number], [number, number]] = [
              [topLeft[0], topLeft[1]],
              [bottomRight[0], bottomRight[1]],
            ]
            subProj.projection.clipExtent(clipExtent)
          }
        }
      }
    })

    const entries: SubProjectionEntry[] = this.subProjections.map(subProj => ({
      id: subProj.territoryCode,
      name: subProj.territoryName,
      projection: subProj.projection as unknown as ProjectionLike,
      bounds: subProj.bounds
        ? {
            minLon: subProj.bounds[0][0],
            minLat: subProj.bounds[0][1],
            maxLon: subProj.bounds[1][0],
            maxLat: subProj.bounds[1][1],
          }
        : undefined,
    }))

    const compositeProjection = buildCompositeProjection({ entries })

    this.compositeProjection = compositeProjection as any
    return compositeProjection as any
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
    if (!this.parameterProvider) {
      debug('exportConfig requires a parameter provider')
      return { subProjections: [] }
    }

    return {
      subProjections: this.subProjections.map((sp) => {
        const parameters = this.parameterProvider!.getExportableParameters(sp.territoryCode)

        return {
          territoryCode: sp.territoryCode,
          territoryName: sp.territoryName,
          projectionType: sp.projectionType,
          ...parameters,
          ...this.getAppliedPositioning(sp.projection),
          translateOffset: sp.translateOffset,
          bounds: sp.bounds,
        }
      }),
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
      scale: subProj.projection.scale?.() ?? (subProj.baseScale * subProj.scaleMultiplier),
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
      scale: subProj.projection.scale?.() ?? (subProj.baseScale * subProj.scaleMultiplier),
    }))
  }
}
