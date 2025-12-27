import type { GeoProjection } from 'd3-geo'
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
  private autoFitDomainEnabled: boolean = true

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
   * Set auto fit domain mode
   * @param enabled - When true, uses domain fitting (auto-zoom to data extent)
   *                  When false, uses manual fitting with scaleMultiplier control
   */
  setAutoFitDomain(enabled: boolean): void {
    this.autoFitDomainEnabled = enabled
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
   * Get canonical positioning from parameters
   *
   * Extracts the geographic focus point from parameters.
   * Parameters are normalized to canonical format (focusLongitude/focusLatitude)
   * at entry points (setAtlasParameters, setTerritoryParameters).
   */
  private getCanonicalPositioning(params: ProjectionParameters): { focusLongitude: number, focusLatitude: number, rotateGamma: number } {
    return {
      focusLongitude: params.focusLongitude ?? 0,
      focusLatitude: params.focusLatitude ?? 0,
      rotateGamma: params.rotateGamma ?? 0,
    }
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

          // Get positioning from canonical format (focusLongitude/focusLatitude)
          // or fall back to legacy format (rotate/center) for backward compatibility
          const positioning = this.getCanonicalPositioning(params)

          // Determine parameter strategy based on projection family
          // D3 projection behavior (from documentation):
          // - AZIMUTHAL: Primary positioning via rotate(), center() is secondary
          // - CONIC: Uses rotate() for positioning with auto-fit, plus parallels()
          // - CYLINDRICAL/PSEUDOCYLINDRICAL: Primary positioning via rotate()
          let rotateParams: [number, number, number] | undefined
          let centerParams: [number, number] | undefined
          let parallelsParams: [number, number] | undefined

          if (definition.family === ProjectionFamily.AZIMUTHAL) {
            // Azimuthal projections: Use rotation for positioning
            // Canonical format focusLongitude/focusLatitude is negated for D3 rotate()
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined // Don't use center for azimuthal
          }
          else if (definition.family === ProjectionFamily.CONIC) {
            // Conic projections use rotate() for positioning with auto-fit
            parallelsParams = params.parallels || [44, 49]
            // Canonical format: focusLongitude/focusLatitude negated for rotate()
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined // Domain fitting will override center
          }
          else {
            // Cylindrical, Pseudocylindrical, Polyhedral: Use rotation
            // For cylindrical projections, the canonical focusLongitude maps to rotation
            rotateParams = [-positioning.focusLongitude, -positioning.focusLatitude, positioning.rotateGamma]
            centerParams = undefined // Don't use center
          }

          const projection = ProjectionFactory.createById(definition.id, {
            center: centerParams,
            parallels: parallelsParams,
          })

          if (!projection) {
            throw new Error(`Failed to create projection: ${definition.id}`)
          }

          // Apply rotation after creation to ensure it's properly set
          // This avoids issues with Observable Plot's fitExtent interfering with rotation
          if (rotateParams) {
            projection.rotate(rotateParams)
          }

          // Parameters are already applied by the factory
          return projection
        },
        // Domain kept for auto-fit mode, removed for manual scale mode
        domain: data,
      }

      // When autoFitDomain is enabled, use Plot's domain fitting (no scale control)
      // When disabled, use manual fitting with scaleMultiplier control
      if (!this.autoFitDomainEnabled) {
        // Apply scaleMultiplier by wrapping the type function
        // Instead of trying to intercept fitExtent (which Plot may not call),
        // we manually fit and apply scale within our type function
        const originalType = config.type
        const getParamsBound = this.getParams.bind(this)
        const geoData = data // Capture data for fitting
        config.type = (dimensions: { width: number, height: number }) => {
          const { width, height } = dimensions
          const proj = originalType(dimensions)

          // Get fresh scaleMultiplier at render time
          const currentParams = getParamsBound()
          const scaleMultiplier = (currentParams.scaleMultiplier as number | undefined) ?? 1.0

          // Manually fit the projection to the extent, then apply scaleMultiplier
          // This replaces Plot's domain fitting with our own controlled fitting
          const inset = 0
          proj.fitExtent(
            [[inset, inset], [width - inset, height - inset]],
            geoData,
          )

          // Apply scale multiplier after fitting
          if (scaleMultiplier !== 1.0) {
            const currentScale = proj.scale()
            proj.scale(currentScale * scaleMultiplier)
          }

          return proj
        }

        // Remove domain since we're doing manual fitting
        delete config.domain
      }

      return config
    }

    // For D3 extended projections, return factory function
    if (definition.strategy === ProjectionStrategy.D3_EXTENDED) {
      const extConfig: any = {
        type: ({ width: _width, height: _height }: { width: number, height: number }) => {
          // CRITICAL: Get fresh params each time Plot calls this function
          const params = this.getParams()

          // Get positioning from canonical format
          const positioning = this.getCanonicalPositioning(params)

          // Determine parameter strategy based on projection family (same as D3_BUILTIN)
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

          // Apply rotation after creation
          if (rotateParams) {
            projection.rotate(rotateParams)
          }

          return projection
        },
        // Domain kept for auto-fit mode, removed for manual scale mode
        domain: data,
      }

      // When autoFitDomain is enabled, use Plot's domain fitting (no scale control)
      // When disabled, use manual fitting with scaleMultiplier control
      if (!this.autoFitDomainEnabled) {
        // Apply scaleMultiplier by wrapping the type function with manual fitting
        const originalExtType = extConfig.type
        const getParamsBound = this.getParams.bind(this)
        const geoData = data // Capture data for fitting
        extConfig.type = (dimensions: { width: number, height: number }) => {
          const { width, height } = dimensions
          const proj = originalExtType(dimensions)

          // Get fresh scaleMultiplier at render time
          const currentParams = getParamsBound()
          const scaleMultiplier = (currentParams.scaleMultiplier as number | undefined) ?? 1.0

          // Manually fit the projection to the extent, then apply scaleMultiplier
          const inset = 0
          proj.fitExtent(
            [[inset, inset], [width - inset, height - inset]],
            geoData,
          )

          // Apply scale multiplier after fitting
          if (scaleMultiplier !== 1.0) {
            const currentScale = proj.scale()
            proj.scale(currentScale * scaleMultiplier)
          }

          return proj
        }

        // Remove domain since we're doing manual fitting
        delete extConfig.domain
      }

      return extConfig
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

  /**
   * Get a fitted D3 GeoProjection for direct D3 rendering
   *
   * Unlike getProjection() which returns config for Observable Plot,
   * this returns an actual D3 GeoProjection instance, fitted to the
   * specified extent and data.
   *
   * @param type - Projection ID
   * @param data - Geographic data for domain calculation
   * @param width - Width to fit to
   * @param height - Height to fit to
   * @param fitToSphere - If true, fit to sphere instead of data
   * @returns Fitted D3 GeoProjection
   */
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

    // Get current parameters
    const params = this.getParams()
    const positioning = this.getCanonicalPositioning(params)

    // Determine parameter strategy based on projection family
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

    // Create the projection
    const projection = ProjectionFactory.createById(definition.id, {
      parallels: parallelsParams,
    })

    if (!projection) {
      debug('Failed to create D3 projection: %s', type)
      return null
    }

    // Apply rotation
    if (rotateParams) {
      projection.rotate(rotateParams)
    }

    // Fit to extent
    const inset = 0
    const domain = fitToSphere ? { type: 'Sphere' as const } : data
    projection.fitExtent(
      [[inset, inset], [width - inset, height - inset]],
      domain as GeoJSON.GeoJsonObject,
    )

    // Apply scale multiplier if set
    const scaleMultiplier = (params.scaleMultiplier as number | undefined) ?? 1.0
    if (scaleMultiplier !== 1.0 && !this.autoFitDomainEnabled) {
      const currentScale = projection.scale()
      projection.scale(currentScale * scaleMultiplier)
    }

    debug('Created fitted D3 projection: %s (%dx%d)', type, width, height)
    return projection
  }
}
