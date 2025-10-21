import type { ProjectionFilterContext, ProjectionRecommendation } from '@/core/projections/types'
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

  /**
   * Set region-specific projection parameters
   * Must be called before using getProjection for region-specific projections
   */
  setProjectionParams(params: ProjectionParameters): void {
    this.projectionParams = params
  }

  /**
   * Set canvas dimensions for scaling calculations
   * @param dimensions - Reference canvas dimensions (defaults to 960×500)
   */
  setCanvasDimensions(dimensions: { width: number, height: number } | null): void {
    this.canvasDimensions = dimensions
  }

  /**
   * Get projection parameters (or use default France params as fallback)
   */
  private getParams(): ProjectionParameters {
    const result = this.projectionParams || {
      center: [2.5, 46.5],
      rotate: [-2, 0],
      parallels: [44, 49],
    }
    return result
  }

  /**
   * Get projection configuration using the new factory system
   * Always uses auto-fit mode (domain fitting) for projections
   * @param type - Projection ID
   * @param data - Geographic data for domain calculation
   * @returns Projection configuration object
   */
  getProjection(type: string, data: any) {
    // CRITICAL: Don't capture params here - access this.projectionParams directly
    // in the projection function to get latest values

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

    // For composite projections, return factory function wrapper
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

      // Check if projection requires custom fitting (e.g., geoAlbersUsa)
      // These projections have fixed internal positioning and need manual scaling
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
              // Scale proportionally based on metadata
              // Use preset canvas dimensions if available, otherwise fall back to customFit metadata
              const referenceWidth = this.canvasDimensions?.width ?? customFit.referenceWidth
              const scaleFactor = width / referenceWidth
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

    // For D3 builtin projections, always create a D3 projection function
    // This gives us full control over parameter application (center, rotate, parallels)
    // Plot accepts: projection: ({width, height}) => d3Projection
    if (definition.strategy === ProjectionStrategy.D3_BUILTIN) {
      this.getParams()

      const config: any = {
        type: ({ width: _width, height: _height }: { width: number, height: number }) => {
          // CRITICAL: Get fresh params each time the function is called to get latest values
          const params = this.getParams()

          // Determine parameter strategy based on projection family
          // D3 projection behavior (from documentation):
          // - AZIMUTHAL: Primary positioning via rotate(), center() is secondary
          // - CONIC: Uses both center() AND rotate(), plus parallels()
          // - CYLINDRICAL/PSEUDOCYLINDRICAL: Primary positioning via rotate()
          let rotateParams: [number, number] | undefined
          let centerParams: [number, number] | undefined
          let parallelsParams: [number, number] | undefined

          if (definition.family === ProjectionFamily.AZIMUTHAL) {
            // Azimuthal projections: Use rotation for positioning
            // rotate[0] = longitude rotation (negated for correct direction)
            // rotate[1] = latitude rotation (negated for correct direction)
            const rotate = params.rotate ?? [0, 0]
            rotateParams = [-rotate[0], -rotate[1]]
            centerParams = undefined // Don't use center for azimuthal
          }
          else if (definition.family === ProjectionFamily.CONIC) {
            // Conic projections use rotate() for positioning with auto-fit
            // Only use center longitude/latitude (rotation is disabled in UI for conic)
            parallelsParams = params.parallels || [44, 49]

            const center = params.center ?? [0, 0]
            const rotateLon = -center[0]
            const rotateLat = -center[1]
            rotateParams = [rotateLon, rotateLat]
            centerParams = undefined // Domain fitting will override center
          }
          else {
            // Cylindrical, Pseudocylindrical, Polyhedral: Use rotation
            const rotate = params.rotate ?? [0, 0]
            rotateParams = [rotate[0], rotate[1]]
            centerParams = undefined // Don't use center
          }

          const projection = ProjectionFactory.createById(definition.id, {
            center: centerParams,
            rotate: rotateParams,
            parallels: parallelsParams,
          })

          if (!projection) {
            throw new Error(`Failed to create projection: ${definition.id}`)
          }

          // Parameters are already applied by the factory
          return projection
        },
        // Always use domain for auto-fitting
        domain: data,
      }

      // Apply zoom level if provided - this modifies the scale after auto-fit
      const zoomLevel = (this.projectionParams as any)?.zoomLevel as number | undefined
      if (zoomLevel && zoomLevel !== 1.0) {
        // Wrap the projection config to apply zoom after Observable Plot's fitExtent
        const originalType = config.type
        config.type = (dimensions: { width: number, height: number }) => {
          const proj = originalType(dimensions)
          // Observable Plot will call fitExtent on this projection
          // We need to intercept the scale after fitting
          const originalFitExtent = proj.fitExtent.bind(proj)
          proj.fitExtent = function (extent: [[number, number], [number, number]], object: any) {
            // Call original fitExtent
            const result = originalFitExtent(extent, object)
            // Apply zoom by multiplying the fitted scale
            const currentScale = proj.scale()
            proj.scale(currentScale * zoomLevel)
            return result
          }
          return proj
        }
      }

      return config
    }

    // For D3 extended projections, return factory function
    if (definition.strategy === ProjectionStrategy.D3_EXTENDED) {
      return {
        type: ({ width: _width, height: _height }: { width: number, height: number }) => {
          // CRITICAL: Get fresh params each time Plot calls this function
          const params = this.getParams()

          // Determine parameter strategy based on projection family (same as D3_BUILTIN)
          let rotateParams: [number, number] | undefined
          let centerParams: [number, number] | undefined
          let parallelsParams: [number, number] | undefined

          if (definition.family === ProjectionFamily.AZIMUTHAL) {
            const rotate = params.rotate || [0, 0]
            rotateParams = [-rotate[0], -rotate[1]]
            centerParams = undefined
          }
          else if (definition.family === ProjectionFamily.CONIC) {
            parallelsParams = params.parallels || [44, 49]
            // Always use auto-fit mode with rotate() for positioning
            const center = params.center || [0, 0]
            rotateParams = [-center[0], -center[1]]
            centerParams = undefined
          }
          else {
            const rotate = params.rotate || [0, 0]
            rotateParams = [rotate[0], rotate[1]]
            centerParams = undefined
          }

          const projection = ProjectionFactory.createById(type, {
            center: centerParams,
            rotate: rotateParams,
            parallels: parallelsParams,
          })

          if (!projection) {
            debug('Failed to create extended projection: %s', type)
            throw new Error(`Failed to create extended projection: ${type}`)
          }

          return projection
        },
        // Always use domain for auto-fitting
        domain: data,
      }
    }

    // Should never reach here, but fallback just in case
    debug('Unknown projection strategy for %s. Falling back to conic-equal-area', type)
    const params = this.getParams()
    return {
      type: 'conic-equal-area' as const,
      parallels: params.parallels || [44, 49],
      rotate: params.rotate || [0, 0],
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
      debug('Could not create projection: %s', id)
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
