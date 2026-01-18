import type { GeoProjection } from 'd3-geo'
import type { ProjectionFilterContext } from '@/core/projections/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily, ProjectionStrategy } from '@/core/projections/types'
import { logger } from '@/utils/logger'

const debug = logger.projection.service

export interface ProjectionOption {
  value: string
  label: string
  category: string
}

export class ProjectionService {
  private projectionParams: ProjectionParameters | null = null
  private canvasDimensions: { width: number, height: number } | null = null
  private autoFitDomainEnabled: boolean = true

  setProjectionParams(params: ProjectionParameters): void {
    this.projectionParams = params
  }

  setCanvasDimensions(dimensions: { width: number, height: number } | null): void {
    this.canvasDimensions = dimensions
  }

  setAutoFitDomain(enabled: boolean): void {
    this.autoFitDomainEnabled = enabled
  }

  private getParams(): ProjectionParameters {
    const result = this.projectionParams || {
      center: [2.5, 46.5],
      rotate: [-2, 0],
      parallels: [44, 49],
    }
    return result
  }

  private getCanonicalPositioning(params: ProjectionParameters): { focusLongitude: number, focusLatitude: number, rotateGamma: number } {
    return {
      focusLongitude: params.focusLongitude ?? 0,
      focusLatitude: params.focusLatitude ?? 0,
      rotateGamma: params.rotateGamma ?? 0,
    }
  }

  getProjection(type: string, data: any) {
    const definition = projectionRegistry.get(type)
    if (!definition) {
      debug('Projection not found: %s', type)
      const params = this.getParams()
      return {
        type: 'conic-equal-area' as const,
        parallels: params.parallels || [44, 49],
        rotate: params.rotate || [-2, 0],
        domain: data,
      }
    }

    if (definition.strategy === ProjectionStrategy.D3_COMPOSITE) {
      const projection = ProjectionFactory.createById(type)
      if (!projection) {
        const params = this.getParams()
        return {
          type: 'conic-equal-area' as const,
          parallels: params.parallels || [44, 49],
          rotate: params.rotate || [-2, 0],
          domain: data,
        }
      }

      if (definition.metadata?.requiresCustomFit) {
        const customFit = definition.metadata.customFit
        if (!customFit) {
          debug('Projection %s requires custom fit but no customFit metadata provided', type)
          return {
            type: () => projection,
            domain: data,
          }
        }

        return {
          type: ({ width, height }: { width: number, height: number }) => {
            const proj = ProjectionFactory.createById(type)
            if (proj) {
              const referenceWidth = this.canvasDimensions?.width ?? customFit.referenceWidth
              const scaleFactor = width / referenceWidth
              proj.scale(customFit.defaultScale * scaleFactor)
              proj.translate([width / 2, height / 2])
            }
            return proj
          },
        }
      }

      return {
        type: () => projection,
        domain: data,
      }
    }

    if (definition.strategy === ProjectionStrategy.D3_BUILTIN) {
      this.getParams()

      const config: any = {
        type: ({ width: _width, height: _height }: { width: number, height: number }) => {
          const params = this.getParams()

          const positioning = this.getCanonicalPositioning(params)

          let rotateParams: [number, number, number] | undefined
          let centerParams: [number, number] | undefined
          let parallelsParams: [number, number] | undefined

          if (definition.family === ProjectionFamily.AZIMUTHAL) {
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined
          }
          else if (definition.family === ProjectionFamily.CONIC) {
            parallelsParams = params.parallels || [44, 49]
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined
          }
          else {
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined
          }

          const projection = ProjectionFactory.createById(definition.id, {
            center: centerParams,
            parallels: parallelsParams,
          })

          if (!projection) {
            throw new Error(`Failed to create projection: ${definition.id}`)
          }

          if (rotateParams) {
            projection.rotate(rotateParams)
          }

          return projection
        },
        domain: data,
      }

      if (!this.autoFitDomainEnabled) {
        const originalType = config.type
        const getParamsBound = this.getParams.bind(this)
        const geoData = data
        config.type = (dimensions: { width: number, height: number }) => {
          const { width, height } = dimensions
          const proj = originalType(dimensions)

          const currentParams = getParamsBound()
          const scaleMultiplier = (currentParams.scaleMultiplier as number | undefined) ?? 1.0

          const inset = 0
          proj.fitExtent(
            [[inset, inset], [width - inset, height - inset]],
            geoData,
          )

          if (scaleMultiplier !== 1.0) {
            const currentScale = proj.scale()
            proj.scale(currentScale * scaleMultiplier)
          }

          return proj
        }

        delete config.domain
      }

      return config
    }

    if (definition.strategy === ProjectionStrategy.D3_EXTENDED) {
      const extConfig: any = {
        type: ({ width: _width, height: _height }: { width: number, height: number }) => {
          const params = this.getParams()
          const positioning = this.getCanonicalPositioning(params)
          let rotateParams: [number, number, number] | undefined
          let centerParams: [number, number] | undefined
          let parallelsParams: [number, number] | undefined

          if (definition.family === ProjectionFamily.AZIMUTHAL) {
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined
          }
          else if (definition.family === ProjectionFamily.CONIC) {
            parallelsParams = params.parallels || [44, 49]
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined
          }
          else {
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined
          }

          const projection = ProjectionFactory.createById(type, {
            center: centerParams,
            parallels: parallelsParams,
          })

          if (!projection) {
            debug('Failed to create extended projection: %s', type)
            throw new Error(`Failed to create extended projection: ${type}`)
          }

          if (rotateParams) {
            projection.rotate(rotateParams)
          }

          return projection
        },
        domain: data,
      }

      if (!this.autoFitDomainEnabled) {
        const originalExtType = extConfig.type
        const getParamsBound = this.getParams.bind(this)
        const geoData = data
        extConfig.type = (dimensions: { width: number, height: number }) => {
          const { width, height } = dimensions
          const proj = originalExtType(dimensions)

          const currentParams = getParamsBound()
          const scaleMultiplier = (currentParams.scaleMultiplier as number | undefined) ?? 1.0

          const inset = 0
          proj.fitExtent(
            [[inset, inset], [width - inset, height - inset]],
            geoData,
          )

          if (scaleMultiplier !== 1.0) {
            const currentScale = proj.scale()
            proj.scale(currentScale * scaleMultiplier)
          }

          return proj
        }

        delete extConfig.domain
      }

      return extConfig
    }

    debug('Unknown projection strategy for %s. Falling back to conic-equal-area', type)
    const params = this.getParams()
    return {
      type: 'conic-equal-area' as const,
      parallels: params.parallels || [44, 49],
      rotate: params.rotate || [0, 0],
      domain: data,
    }
  }

  getAvailableProjections(context: ProjectionFilterContext = {}): ProjectionOption[] {
    const projections = projectionRegistry.filter(context)

    return projections.map(def => ({
      value: def.id,
      label: def.name, // This should be translated by the UI layer
      category: def.category,
    }))
  }

  createProjection(id: string, parameters: any = {}) {
    const projection = ProjectionFactory.createById(id, parameters)
    if (!projection) {
      debug('Could not create projection: %s', id)
      return null
    }
    return projection
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
    const positioning = this.getCanonicalPositioning(params)
    let rotateParams: [number, number, number] | undefined
    let parallelsParams: [number, number] | undefined

    if (definition.family === ProjectionFamily.AZIMUTHAL) {
      rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
    }
    else if (definition.family === ProjectionFamily.CONIC) {
      parallelsParams = params.parallels || [44, 49]
      rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
    }
    else {
      rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
    }

    const projection = ProjectionFactory.createById(definition.id, {
      parallels: parallelsParams,
    })

    if (!projection) {
      debug('Failed to create D3 projection: %s', type)
      return null
    }

    if (rotateParams) {
      projection.rotate(rotateParams)
    }

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
