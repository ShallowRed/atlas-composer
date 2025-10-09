import type { ProjectionParams } from '@/core/atlases/loader'
import type { ProjectionFilterContext, ProjectionRecommendation } from '@/core/projections/types'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily, ProjectionStrategy } from '@/core/projections/types'

export interface ProjectionOption {
  value: string
  label: string
  category: string
}

export class ProjectionService {
  private projectionParams: ProjectionParams | null = null

  /**
   * Set region-specific projection parameters
   * Must be called before using getProjection for region-specific projections
   */
  setProjectionParams(params: ProjectionParams): void {
    this.projectionParams = params
  }

  /**
   * Get projection parameters (or use default France params as fallback)
   */
  private getParams(): ProjectionParams {
    // Default fallback to France params for backward compatibility
    return this.projectionParams || {
      center: { longitude: 2.5, latitude: 46.5 },
      rotate: { mainland: [-2, 0], azimuthal: [-2, -46.5] },
      parallels: { conic: [44, 49] },
    }
  }

  /**
   * Get projection configuration using the new factory system
   * @param type - Projection ID
   * @param data - Geographic data for domain calculation
   * @returns Projection configuration object
   */
  getProjection(type: string, data: any) {
    const params = this.getParams()

    // Get projection definition from registry
    const definition = projectionRegistry.get(type)

    if (!definition) {
      console.warn(`[ProjectionService] Unknown projection type: ${type}. Falling back to conic-equal-area.`)
      // Fallback to albers/conic-equal-area for backward compatibility
      return {
        type: 'conic-equal-area' as const,
        parallels: params.parallels.conic,
        rotate: params.rotate.mainland,
        domain: data,
      }
    }

    // For composite projections, return factory function wrapper
    if (definition.strategy === ProjectionStrategy.D3_COMPOSITE) {
      const projection = ProjectionFactory.createById(type)
      if (!projection) {
        return {
          type: 'conic-equal-area' as const,
          parallels: params.parallels.conic,
          rotate: params.rotate.mainland,
          domain: data,
        }
      }

      // Check if projection requires custom fitting (e.g., geoAlbersUsa)
      // These projections have fixed internal positioning and need manual scaling
      if (definition.metadata?.requiresCustomFit) {
        const customFit = definition.metadata.customFit
        if (!customFit) {
          console.error(`[ProjectionService] Projection ${type} requires custom fit but no customFit metadata provided`)
          return {
            type: () => projection,
            domain: data,
          }
        }

        return {
          type: ({ width, height }: { width: number, height: number }) => {
            const proj = ProjectionFactory.createById(type)
            if (proj) {
              // Scale proportionally based on metadata
              const scaleFactor = width / customFit.referenceWidth
              proj.scale(customFit.defaultScale * scaleFactor)
              proj.translate([width / 2, height / 2])
            }
            return proj
          },
        }
      }

      // For standard composite projections (d3-composite-projections), use domain
      return {
        type: () => projection,
        domain: data,
      }
    }

    // For D3 builtin projections, return type string with parameters
    if (definition.strategy === ProjectionStrategy.D3_BUILTIN) {
      const config: any = {
        type: definition.id as any,
        domain: data,
      }

      // Apply parameters based on projection family
      if (definition.family === ProjectionFamily.CONIC) {
        config.parallels = params.parallels.conic
        config.rotate = params.rotate.mainland
        console.log(`[ProjectionService] Conic projection ${definition.id}: parallels=${config.parallels}, rotate=${config.rotate}`)
      }
      else if (definition.family === ProjectionFamily.AZIMUTHAL) {
        config.rotate = params.rotate.azimuthal
        console.log(`[ProjectionService] Azimuthal projection ${definition.id}: rotate=${config.rotate}`)
      }
      // Cylindrical and world projections typically don't need special parameters

      return config
    }

    // For D3 extended projections, return factory function
    if (definition.strategy === ProjectionStrategy.D3_EXTENDED) {
      const projection = ProjectionFactory.createById(type, {
        center: [params.center.longitude, params.center.latitude],
        rotate: params.rotate.mainland,
      })

      if (!projection) {
        console.error(`[ProjectionService] Failed to create extended projection: ${type}`)
        return {
          type: 'conic-equal-area' as const,
          parallels: params.parallels.conic,
          rotate: params.rotate.mainland,
          domain: data,
        }
      }

      return {
        type: () => projection,
        domain: data,
      }
    }

    // Should never reach here, but fallback just in case
    console.warn(`[ProjectionService] Unknown projection strategy for ${type}. Falling back to conic-equal-area.`)
    return {
      type: 'conic-equal-area' as const,
      parallels: params.parallels.conic,
      rotate: params.rotate.mainland,
      domain: data,
    }
  }

  /**
   * Get available projections for a given context
   * Uses the new projection registry system
   */
  getAvailableProjections(context: ProjectionFilterContext = {}): ProjectionOption[] {
    const projections = projectionRegistry.filter(context)

    return projections.map(def => ({
      value: def.id,
      label: def.name, // This should be translated by the UI layer
      category: def.category,
    }))
  }

  /**
   * Get projection recommendations for a given context
   * Returns projections ranked by suitability score
   */
  getRecommendations(context: ProjectionFilterContext = {}): ProjectionRecommendation[] {
    return projectionRegistry.recommend(context)
  }

  /**
   * Create a projection using the new factory (for future use)
   * This method can gradually replace getProjection()
   */
  createProjection(id: string, parameters: any = {}) {
    const projection = ProjectionFactory.createById(id, parameters)
    if (!projection) {
      console.warn(`[ProjectionService] Could not create projection: ${id}`)
      return null
    }
    return projection
  }

  /**
   * Check if a projection ID is valid
   */
  isValidProjection(id: string): boolean {
    return projectionRegistry.isValid(id)
  }
}
