import type { GeoProjection } from 'd3-geo'
import type { ProjectionFilterContext } from '@/core/projections/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { applyPositioning } from '@/core/positioning'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { logger } from '@/utils/logger'

const debug = logger.projection.service

export interface ProjectionOption {
  value: string
  label: string
  category: string
}

export class ProjectionService {
  private projectionParams: ProjectionParameters | null = null
  private autoFitDomainEnabled: boolean = true

  setProjectionParams(params: ProjectionParameters): void {
    this.projectionParams = params
  }

  setAutoFitDomain(enabled: boolean): void {
    this.autoFitDomainEnabled = enabled
  }

  private getParams(): ProjectionParameters {
    return this.projectionParams ?? {}
  }

  getAvailableProjections(context: ProjectionFilterContext = {}): ProjectionOption[] {
    const projections = projectionRegistry.filter(context)

    return projections.map(def => ({
      value: def.id,
      label: def.name, // This should be translated by the UI layer
      category: def.category,
    }))
  }

  isValidProjection(id: string): boolean {
    return projectionRegistry.isValid(id)
  }

  getD3Projection(
    type: string,
    data: GeoJSON.FeatureCollection | GeoJSON.Feature | { type: 'Sphere' },
    width: number,
    height: number,
    fitToSphere = false,
  ): GeoProjection | null {
    const definition = projectionRegistry.get(type)
    if (!definition) {
      debug('Projection not found for D3: %s', type)
      return null
    }

    const params = this.getParams()
    const projection = ProjectionFactory.createById(definition.id)

    if (!projection) {
      debug('Failed to create D3 projection: %s', type)
      return null
    }

    applyPositioning(projection, params, 'global')

    const inset = 0
    const domain = fitToSphere ? { type: 'Sphere' as const } : data
    projection.fitExtent(
      [[inset, inset], [width - inset, height - inset]],
      domain as any,
    )

    const scaleMultiplier = (params.scaleMultiplier as number | undefined) ?? 1.0
    if (scaleMultiplier !== 1.0 && !this.autoFitDomainEnabled) {
      const currentScale = projection.scale()
      projection.scale(currentScale * scaleMultiplier)
    }

    debug('Created fitted D3 projection: %s (%dx%d)', type, width, height)
    return projection
  }
}
