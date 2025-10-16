import type { GeoProjection } from 'd3-geo'
import type { CompositeProjectionConfig, TerritoryConfig } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import {
  geoAzimuthalEqualArea,
  geoAzimuthalEquidistant,
  geoConicConformal,
  geoConicEqualArea,
  geoEquirectangular,
  geoMercator,
} from 'd3-geo'

import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'

/**
 * Parameter provider interface for dependency injection
 * Allows CompositeProjection to get dynamic parameters without direct store coupling
 */
export interface ProjectionParameterProvider {
  getEffectiveParameters: (territoryCode: string) => ProjectionParameters
  getExportableParameters: (territoryCode: string) => ProjectionParameters
}

/**
 * Configuration for a sub-projection within a composite projection
 */
interface SubProjectionConfig {
  territoryCode: string
  territoryName: string
  projection: GeoProjection
  projectionType: string // Store the projection type/ID for export
  baseScale: number // Prevents scale accumulation on rebuild
  scaleMultiplier: number // Current scale multiplier (used to preserve scale when changing projection type)
  baseTranslate: [number, number] // Prevents translation accumulation on rebuild
  translateOffset: [number, number]
  clipExtent: [[number, number], [number, number]] | null
  bounds?: [[number, number], [number, number]]
}

/**
 * Custom composite projection that allows individual projections per territory
 * with manual positioning (insets)
 * Supports both traditional (1 mainland + N overseas) and multi-mainland (N mainlands + M overseas) patterns
 */
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

  /**
   * Get projection parameters for a territory
   * Uses parameter provider if available, otherwise falls back to config
   */
  private getParametersForTerritory(territoryCode: string, configParams: TerritoryConfig): ProjectionParameters {
    if (this.parameterProvider) {
      const dynamicParams = this.parameterProvider.getEffectiveParameters(territoryCode)
      // Merge config params with dynamic params (dynamic params take precedence)
      // Use ?? instead of || to properly handle arrays and zero values
      return {
        center: dynamicParams.center ?? configParams.center,
        rotate: dynamicParams.rotate ?? configParams.rotate,
        parallels: dynamicParams.parallels ?? configParams.parallels,
        scale: dynamicParams.scale, // For backward compatibility only - not used
        translate: dynamicParams.translate, // configParams doesn't have translate
        clipAngle: dynamicParams.clipAngle, // configParams doesn't have clipAngle
        precision: dynamicParams.precision, // configParams doesn't have precision
        baseScale: dynamicParams.baseScale, // For backward compatibility only - not used
        scaleMultiplier: dynamicParams.scaleMultiplier ?? 1.0, // The only scale value we actually use
      }
    }
    // Fallback to config params - convert TerritoryConfig to ProjectionParameters
    return {
      center: configParams.center,
      rotate: configParams.rotate,
      parallels: configParams.parallels,
      // These are parameter-only properties, not in TerritoryConfig
      scale: undefined,
      translate: undefined,
      clipAngle: undefined,
      precision: undefined,
    }
  }

  /**
   * Initialize all sub-projections with their geographic centers and base settings
   * Uses provided configuration for territories
   *
   * This implementation follows d3-composite-projections approach:
   * 1. Use a single reference scale for all projections
   * 2. Apply territory-specific baseScaleMultiplier from territory data
   * 3. The multipliers ensure proper visual composition while maintaining proportionality
   */
  private initialize() {
    if (this.config.type === 'single-focus') {
      this.initializeSingleFocus()
    }
    else {
      this.initializeEqualMembers()
    }
  }

  /**
   * Initialize single-focus pattern: 1 primary + N secondary territories
   */
  private initializeSingleFocus() {
    if (this.config.type !== 'single-focus') {
      return
    }
    const { mainland, overseasTerritories } = this.config

    // Reference scale for all territories (like d3-composite-projections does)
    // This is the "base unit" that all territories scale relative to
    // Use preset referenceScale if provided, or default to 2700
    const REFERENCE_SCALE = this.referenceScale ?? 2700

    // Mainland territory - use projection type from config if available, otherwise default to Conic Conformal
    const mainlandProjectionType = mainland.projectionType || 'conic-conformal'
    const mainlandProjection = this.createProjectionByType(mainlandProjectionType)
      .translate([0, 0])

    // Get parameters from parameter provider or config
    const mainlandParams = this.getParametersForTerritory(mainland.code, mainland)

    // For conic projections, use rotate instead of center (as d3-composite-projections does)
    // For mercator/other projections, use center
    if (mainlandProjection.rotate && mainlandParams.rotate) {
      // Conic projection: use rotate to position
      mainlandProjection.rotate(mainlandParams.rotate as [number, number] | [number, number, number])
    }
    else if (mainlandParams.center) {
      // Mercator/other: use center to position
      mainlandProjection.center(mainlandParams.center as [number, number])
    }

    // Apply parallels if supported and provided
    if ((mainlandProjection as any).parallels && mainlandParams.parallels) {
      (mainlandProjection as any).parallels(mainlandParams.parallels)
    }

    // Determine scale values
    // baseScale always comes from referenceScale (not from preset)
    // scaleMultiplier comes from preset parameter store (defaults to 1.0)
    const mainlandBaseScale = REFERENCE_SCALE
    const mainlandScaleMultiplier = mainlandParams.scaleMultiplier ?? 1.0

    mainlandProjection.scale(mainlandBaseScale * mainlandScaleMultiplier)

    this.addSubProjection({
      territoryCode: mainland.code,
      territoryName: mainland.name,
      projection: mainlandProjection,
      projectionType: mainlandProjectionType,
      baseScale: mainlandBaseScale,
      scaleMultiplier: mainlandScaleMultiplier,
      baseTranslate: [0, 0],
      clipExtent: mainland.clipExtent
        ? [[mainland.clipExtent.x1, mainland.clipExtent.y1], [mainland.clipExtent.x2, mainland.clipExtent.y2]]
        : null,
      translateOffset: mainland.offset,
      bounds: mainland.bounds,
    })

    // Overseas territories - each gets reference scale * baseScaleMultiplier
    overseasTerritories.forEach((territory) => {
      const projectionType = territory.projectionType || 'mercator'
      const projection = this.createProjectionByType(projectionType)
        .translate([0, 0])

      // Get parameters from parameter provider or config
      const territoryParams = this.getParametersForTerritory(territory.code, territory)

      // Apply center/rotate based on projection type
      // For conic projections, prefer rotate; for cylindrical/azimuthal, prefer center
      const isConicProjection = projectionType.includes('conic') || projectionType.includes('albers')

      if (isConicProjection && projection.rotate && territoryParams.rotate) {
        projection.rotate(territoryParams.rotate as [number, number] | [number, number, number])
      }
      else if (territoryParams.center) {
        projection.center(territoryParams.center as [number, number])
      }
      else if (projection.rotate && territoryParams.rotate) {
        projection.rotate(territoryParams.rotate as [number, number] | [number, number, number])
      }

      // Apply parallels if supported
      if ((projection as any).parallels && territoryParams.parallels) {
        (projection as any).parallels(territoryParams.parallels)
      }

      // Determine scale values
      // baseScale always comes from referenceScale (not from preset)
      // scaleMultiplier comes from preset parameter store (defaults to 1.0)
      // Note: territory.baseScaleMultiplier is a config-level default for territories without presets
      const baseMultiplier = territory.baseScaleMultiplier ?? 1.0
      const territoryBaseScale = REFERENCE_SCALE * baseMultiplier
      const territoryScaleMultiplier = territoryParams.scaleMultiplier ?? 1.0

      projection.scale(territoryBaseScale * territoryScaleMultiplier)

      this.addSubProjection({
        territoryCode: territory.code,
        territoryName: territory.name,
        projection,
        projectionType,
        baseScale: territoryBaseScale,
        scaleMultiplier: territoryScaleMultiplier,
        baseTranslate: [0, 0],
        clipExtent: territory.clipExtent
          ? [[territory.clipExtent.x1, territory.clipExtent.y1], [territory.clipExtent.x2, territory.clipExtent.y2]]
          : null,
        translateOffset: territory.offset,
        bounds: territory.bounds,
      })
    })
  }

  /**
   * Initialize equal-members pattern: N equal members + M secondary territories
   * All members are treated equally with no hierarchy
   */
  private initializeEqualMembers() {
    if (this.config.type !== 'equal-members') {
      return
    }
    const { mainlands, overseasTerritories } = this.config

    // Reference scale for all territories
    // Use preset referenceScale if provided, or default to 200 for equal-members
    const REFERENCE_SCALE = this.referenceScale ?? 200

    // Process all mainlands equally - no special treatment for any
    mainlands.forEach((mainland) => {
      const mainlandProjectionType = mainland.projectionType || 'conic-conformal'
      const mainlandProjection = this.createProjectionByType(mainlandProjectionType)
        .translate([0, 0])

      // Get parameters from parameter provider or config
      const mainlandParams = this.getParametersForTerritory(mainland.code, mainland)

      // For conic projections, use rotate instead of center (as d3-composite-projections does)
      // For mercator/other projections, use center
      if (mainlandProjection.rotate && mainlandParams.rotate) {
        // Conic projection: use rotate to position
        mainlandProjection.rotate(mainlandParams.rotate as [number, number] | [number, number, number])
      }
      else if (mainlandParams.center) {
        // Mercator/other: use center to position
        mainlandProjection.center(mainlandParams.center as [number, number])
      }

      // Apply parallels if supported and provided
      if ((mainlandProjection as any).parallels && mainlandParams.parallels) {
        (mainlandProjection as any).parallels(mainlandParams.parallels)
      }

      // Determine scale values
      // baseScale always comes from referenceScale (not from preset)
      // scaleMultiplier comes from preset parameter store (defaults to 1.0)
      const mainlandBaseScale = REFERENCE_SCALE
      const mainlandScaleMultiplier = mainlandParams.scaleMultiplier ?? 1.0

      mainlandProjection.scale(mainlandBaseScale * mainlandScaleMultiplier)

      this.addSubProjection({
        territoryCode: mainland.code,
        territoryName: mainland.name,
        projection: mainlandProjection,
        projectionType: mainlandProjectionType,
        baseScale: mainlandBaseScale,
        scaleMultiplier: mainlandScaleMultiplier,
        baseTranslate: [0, 0],
        clipExtent: mainland.clipExtent
          ? [[mainland.clipExtent.x1, mainland.clipExtent.y1], [mainland.clipExtent.x2, mainland.clipExtent.y2]]
          : null,
        translateOffset: mainland.offset,
        bounds: mainland.bounds,
      })
    })

    // Overseas territories (if any)
    overseasTerritories.forEach((territory) => {
      const projectionType = territory.projectionType || 'mercator'
      const projection = this.createProjectionByType(projectionType)
        .translate([0, 0])

      // Get parameters from parameter provider or config
      const territoryParams = this.getParametersForTerritory(territory.code, territory)

      // Apply center/rotate based on projection type
      // For conic projections, prefer rotate; for cylindrical/azimuthal, prefer center
      const isConicProjection = projectionType.includes('conic') || projectionType.includes('albers')

      if (isConicProjection && projection.rotate && territoryParams.rotate) {
        projection.rotate(territoryParams.rotate as [number, number] | [number, number, number])
      }
      else if (territoryParams.center) {
        projection.center(territoryParams.center as [number, number])
      }
      else if (projection.rotate && territoryParams.rotate) {
        projection.rotate(territoryParams.rotate as [number, number] | [number, number, number])
      }

      // Apply parallels if supported
      if ((projection as any).parallels && territoryParams.parallels) {
        (projection as any).parallels(territoryParams.parallels)
      }

      // Determine scale values
      // baseScale always comes from referenceScale (not from preset)
      // scaleMultiplier comes from preset parameter store (defaults to 1.0)
      // Note: territory.baseScaleMultiplier is a config-level default for territories without presets
      const baseMultiplier = territory.baseScaleMultiplier ?? 1.0
      const territoryBaseScale = REFERENCE_SCALE * baseMultiplier
      const territoryScaleMultiplier = territoryParams.scaleMultiplier ?? 1.0

      projection.scale(territoryBaseScale * territoryScaleMultiplier)

      this.addSubProjection({
        territoryCode: territory.code,
        territoryName: territory.name,
        projection,
        projectionType,
        baseScale: territoryBaseScale,
        scaleMultiplier: territoryScaleMultiplier,
        baseTranslate: [0, 0],
        clipExtent: territory.clipExtent
          ? [[territory.clipExtent.x1, territory.clipExtent.y1], [territory.clipExtent.x2, territory.clipExtent.y2]]
          : null,
        translateOffset: territory.offset,
        bounds: territory.bounds,
      })
    })
  }

  /**
   * Create a projection instance by type name
   */
  private createProjectionByType(projectionType: string): GeoProjection {
    // Try to use the new ProjectionFactory first
    if (projectionRegistry.isValid(projectionType)) {
      const projection = ProjectionFactory.createById(projectionType)
      if (projection) {
        return projection
      }
    }

    // Fallback to legacy switch statement for backward compatibility
    switch (projectionType) {
      case 'mercator':
        return geoMercator()
      case 'conic-conformal':
        return geoConicConformal()
      case 'conic-equal-area':
      case 'albers':
        return geoConicEqualArea()
      case 'azimuthal-equal-area':
        return geoAzimuthalEqualArea()
      case 'azimuthal-equidistant':
        return geoAzimuthalEquidistant()
      case 'equirectangular':
        return geoEquirectangular()
      default:
        console.warn(`[CompositeProjection] Unknown projection type: ${projectionType}, falling back to Mercator`)
        return geoMercator()
    }
  }

  /**
   * Add or update a sub-projection configuration
   */
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

    // Invalidate composite projection to force rebuild
    this.compositeProjection = null
  }

  /**
   * Update projection type for a specific territory
   * Preserves center, scale, and translate from the existing projection
   */
  updateTerritoryProjection(
    territoryCode: string,
    projectionType: string,
  ) {
    const subProj = this.subProjections.find((sp) => {
      return sp.territoryCode === territoryCode
    })
    if (!subProj) {
      return
    }

    // Save current settings
    const currentScale = subProj.projection.scale()
    const currentCenter = subProj.projection.center ? subProj.projection.center() : null
    const currentRotate = subProj.projection.rotate ? subProj.projection.rotate() : null
    const currentTranslate = subProj.projection.translate()

    // Create new projection based on type
    let newProjection: GeoProjection

    // Try to use the new ProjectionFactory first
    if (projectionRegistry.isValid(projectionType)) {
      const factoryProjection = ProjectionFactory.createById(projectionType)
      if (factoryProjection) {
        newProjection = factoryProjection

        // Apply parallels for conic projections if center is available
        if (currentCenter && (projectionType.includes('conic') || projectionType === 'albers')) {
          if ('parallels' in newProjection) {
            (newProjection as any).parallels([currentCenter[1] - 2, currentCenter[1] + 2])
          }
        }
      }
      else {
        // Factory failed, fall back to legacy code
        newProjection = this.createProjectionByType(projectionType)
      }
    }
    else {
      // Fallback to legacy switch statement
      switch (projectionType) {
        case 'mercator':
          newProjection = geoMercator()
          break
        case 'conic-conformal':
          newProjection = geoConicConformal()
          if (currentCenter) {
            (newProjection as any).parallels([currentCenter[1] - 2, currentCenter[1] + 2])
          }
          break
        case 'conic-equal-area':
        case 'albers':
          newProjection = geoConicEqualArea()
          if (currentCenter) {
            (newProjection as any).parallels([currentCenter[1] - 2, currentCenter[1] + 2])
          }
          break
        case 'azimuthal-equal-area':
          newProjection = geoAzimuthalEqualArea()
          break
        case 'azimuthal-equidistant':
          newProjection = geoAzimuthalEquidistant()
          break
        case 'equirectangular':
          newProjection = geoEquirectangular()
          break
        default:
          console.warn(`[CompositeProjection] Unknown projection type: ${projectionType}, falling back to Mercator`)
          newProjection = geoMercator()
      }
    }

    // Restore settings
    newProjection.scale(currentScale)
    if (currentCenter && newProjection.center) {
      newProjection.center(currentCenter)
    }
    if (currentRotate && newProjection.rotate) {
      newProjection.rotate(currentRotate)
    }
    newProjection.translate(currentTranslate)

    // Update the projection
    subProj.projection = newProjection

    // Recalculate baseScale only if needed
    // Check if current scale matches baseScale * multiplier (within tolerance)
    const expectedScale = subProj.baseScale * subProj.scaleMultiplier
    if (Math.abs(currentScale - expectedScale) > 0.1) {
      // Scale doesn't match expected value - recalculate baseScale
      // currentScale = baseScale * multiplier, so we need to extract the base scale
      subProj.baseScale = currentScale / subProj.scaleMultiplier
    }

    this.compositeProjection = null // Force rebuild
  }

  /**
   * Update translation offset for a territory
   */
  updateTranslationOffset(territoryCode: string, offset: [number, number]) {
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (subProj) {
      subProj.translateOffset = offset
      this.compositeProjection = null
    }
  }

  /**
   * Update scale for a territory
   */
  updateScale(territoryCode: string, scaleMultiplier: number) {
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (subProj) {
      // Check if user has manually overridden the scale parameter
      if (this.parameterProvider) {
        const params = this.parameterProvider.getEffectiveParameters(territoryCode)
        const expectedScale = subProj.baseScale * subProj.scaleMultiplier

        // If params.scale exists and differs from expected scale, user has overridden it
        // We should not overwrite it with the multiplier
        if (params.scale !== undefined && Math.abs(params.scale - expectedScale) > 0.1) {
          console.log(`[CompositeProjection] updateScale skipped for ${territoryCode} - scale parameter override detected (expected=${expectedScale}, actual=${params.scale})`)
          return
        }
      }

      // Store the multiplier so it's preserved when changing projection type
      subProj.scaleMultiplier = scaleMultiplier
      // Apply multiplier to base scale (not current scale to avoid accumulation)
      const newScale = subProj.baseScale * scaleMultiplier
      subProj.projection.scale(newScale)

      // Note: scale is a computed value (baseScale × scaleMultiplier), never stored
      // The scaleMultiplier is what's stored in the parameter store
      this.compositeProjection = null
    }
  }

  /**
   * Update projection parameters for a territory
   * Uses parameter provider to get updated parameters and applies them to the projection
   */
  updateTerritoryParameters(territoryCode: string) {
    if (!this.parameterProvider) {
      console.warn(`[CompositeProjection] No parameter provider available for territory ${territoryCode}`)
      return // No parameter provider, nothing to update
    }

    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (!subProj) {
      console.warn(`[CompositeProjection] Territory ${territoryCode} not found in subprojections`)
      return
    }

    try {
      // Get updated parameters from parameter provider
      const params = this.parameterProvider.getEffectiveParameters(territoryCode)
      const projection = subProj.projection

      console.log(`[CompositeProjection] updateTerritoryParameters for ${territoryCode}:`, {
        currentBaseScale: subProj.baseScale,
        currentScaleMultiplier: subProj.scaleMultiplier,
        currentProjectionScale: projection.scale(),
        paramsScale: params.scale,
        paramsBaseScale: params.baseScale,
        paramsScaleMultiplier: params.scaleMultiplier,
        paramsRotate: params.rotate,
        paramsCenter: params.center,
        paramsParallels: params.parallels,
      })

      if (!projection) {
        console.error(`[CompositeProjection] Projection not found for territory ${territoryCode}`)
        return
      }

      // Apply center/rotate based on what's available
      if (projection.rotate && params.rotate) {
        // Validate rotate parameters
        const rotate = params.rotate as [number, number] | [number, number, number]
        if (Array.isArray(rotate) && rotate.length >= 2 && rotate.every(r => typeof r === 'number' && !Number.isNaN(r))) {
          projection.rotate(rotate)
        }
        else {
          console.warn(`[CompositeProjection] Invalid rotate parameters for ${territoryCode}:`, params.rotate)
        }
      }
      else if (params.center) {
        // Validate center parameters
        const center = params.center as [number, number]
        if (Array.isArray(center) && center.length === 2 && center.every(c => typeof c === 'number' && !Number.isNaN(c))) {
          projection.center(center)
        }
        else {
          console.warn(`[CompositeProjection] Invalid center parameters for ${territoryCode}:`, params.center)
        }
      }

      // Apply parallels if supported
      if ((projection as any).parallels && params.parallels) {
        const parallels = params.parallels as [number, number]
        if (Array.isArray(parallels) && parallels.length === 2 && parallels.every(p => typeof p === 'number' && !Number.isNaN(p))) {
          (projection as any).parallels(parallels)
        }
        else {
          console.warn(`[CompositeProjection] Invalid parallels parameters for ${territoryCode}:`, params.parallels)
        }
      }

      // CRITICAL: Update scaleMultiplier from params if provided
      if (params.scaleMultiplier !== undefined && typeof params.scaleMultiplier === 'number' && !Number.isNaN(params.scaleMultiplier)) {
        subProj.scaleMultiplier = params.scaleMultiplier
      }

      // CRITICAL: Re-apply scale after updating parameters
      // Some D3 projections may reset scale when rotate/center/parallels are changed
      // Calculate scale from baseScale × scaleMultiplier (referenceScale is already in baseScale)
      // Note: scale parameter is not user-editable - it's computed only
      const correctScale = subProj.baseScale * subProj.scaleMultiplier
      projection.scale(correctScale)

      // Note: translate parameter is applied during build() to combine with territory positioning

      // Apply precision if supported
      if (projection.precision && params.precision !== undefined && typeof params.precision === 'number' && !Number.isNaN(params.precision)) {
        projection.precision(params.precision)
      }

      // Force rebuild of composite projection
      this.compositeProjection = null
    }
    catch (error) {
      console.error(`[CompositeProjection] Error updating parameters for territory ${territoryCode}:`, error)
      // Don't re-throw, just log the error to prevent UI breakage
    }
  }

  /**
   * Build the composite projection - albersUsa style with proper clip regions
   */
  build(width = 800, height = 600, forceRebuild = false): GeoProjection {
    if (this.compositeProjection && !forceRebuild) {
      return this.compositeProjection
    }

    // Center point for the map (mainland territory will be centered here)
    const centerX = width / 2
    const centerY = height / 2

    // Apply translation offsets to each sub-projection (like albersUsa does)
    // The offset is applied via .translate() which moves the projection output
    const epsilon = 1e-6

    this.subProjections.forEach((subProj) => {
      // Get current translate parameter if set via parameter controls
      const parameterProvider = this.parameterProvider
      let parameterTranslate: [number, number] = [0, 0]
      if (parameterProvider) {
        const params = parameterProvider.getEffectiveParameters(subProj.territoryCode)
        if (params.translate) {
          parameterTranslate = params.translate as [number, number]
        }
      }

      // All territories are positioned relative to the map center
      // Mainland has offset [0,0] or close to it, so it will be centered
      // Others have their configured offsets relative to center
      // Add any parameter-based translate offset to the territory positioning
      const newTranslate: [number, number] = [
        centerX + subProj.translateOffset[0] + parameterTranslate[0],
        centerY + subProj.translateOffset[1] + parameterTranslate[1],
      ]
      subProj.projection.translate(newTranslate)

      // If territory has a predefined clipExtent (from config), use it
      // This is the case for d3-composite-projections style definitions
      // Check if predefined clipExtent exists and is valid
      if (
        subProj.clipExtent
        && subProj.clipExtent[0]?.[0] !== undefined
        && subProj.clipExtent[0]?.[1] !== undefined
        && subProj.clipExtent[1]?.[0] !== undefined
        && subProj.clipExtent[1]?.[1] !== undefined
      ) {
        const k = subProj.projection.scale()
        const [x, y] = newTranslate
        const [[x1, y1], [x2, y2]] = subProj.clipExtent

        // Convert normalized clipExtent to pixel coordinates
        // clipExtent values are normalized fractions of scale
        const pixelClipExtent: [[number, number], [number, number]] = [
          [x + x1 * k, y + y1 * k],
          [x + x2 * k, y + y2 * k],
        ]
        subProj.projection.clipExtent(pixelClipExtent)
      }
      // Otherwise, calculate clipExtent from geographic bounds
      else if (subProj.bounds) {
        const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds

        // Project the bounds corners to get clip extent in screen coordinates
        // NOW the projection already includes the offset
        const topLeft = subProj.projection([minLon + epsilon, maxLat - epsilon])
        const bottomRight = subProj.projection([maxLon - epsilon, minLat + epsilon])

        if (topLeft && bottomRight) {
          // Set clip extent (already in final coordinate space thanks to translate)
          subProj.projection.clipExtent([
            [topLeft[0], topLeft[1]],
            [bottomRight[0], bottomRight[1]],
          ])
        }
        else {
          // If projection fails (e.g. due to rotation), don't set clipExtent
          // This allows the territory to render without clipping
          console.warn(`[CompositeProjection] Failed to project bounds for ${subProj.territoryCode}, skipping clipExtent`)
        }
      }
    })

    // Point capture mechanism (like albersUsa)
    let capturedPoint: [number, number] | null = null
    const pointStream = {
      point: (x: number, y: number) => {
        capturedPoint = [x, y]
      },
      lineStart: () => {},
      lineEnd: () => {},
      polygonStart: () => {},
      polygonEnd: () => {},
      sphere: () => {},
    }

    // Create point capture for each sub-projection
    const subProjPoints = this.subProjections.map(subProj => ({
      subProj,
      stream: subProj.projection.stream(pointStream),
    }))

    // Main projection function (like albersUsa)
    const compositeProjection = (coordinates: [number, number]): [number, number] | null => {
      const [lon, lat] = coordinates

      capturedPoint = null

      // Try each sub-projection's bounds
      for (const { subProj, stream } of subProjPoints) {
        if (subProj.bounds) {
          const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds

          if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
            // Project through stream (offset already applied in projection.translate)
            stream.point(lon, lat)

            if (capturedPoint) {
              return capturedPoint
            }
          }
        }
      }

      // No match found
      return null
    }

    // Multiplex stream (like albersUsa) - now with proper clip regions
    ;(compositeProjection as any).stream = (stream: any) => {
      const streams = this.subProjections.map(sp => sp.projection.stream(stream))
      return {
        point: (x: number, y: number) => {
          for (const s of streams) s.point(x, y)
        },
        sphere: () => {
          for (const s of streams) {
            if (s.sphere)
              s.sphere()
          }
        },
        lineStart: () => {
          for (const s of streams) s.lineStart()
        },
        lineEnd: () => {
          for (const s of streams) s.lineEnd()
        },
        polygonStart: () => {
          for (const s of streams) s.polygonStart()
        },
        polygonEnd: () => {
          for (const s of streams) s.polygonEnd()
        },
      }
    }

    // Add invert
    ;(compositeProjection as any).invert = (coordinates: [number, number]) => {
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
        return null
      }

      const [x, y] = coordinates

      // Try each sub-projection's invert
      // No need to manually adjust coordinates - D3 projection.invert() already
      // handles the translate() that was applied in build()
      for (const subProj of this.subProjections) {
        const inverted = subProj.projection.invert?.([x, y])
        if (inverted && subProj.bounds) {
          const [lon, lat] = inverted
          const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds
          if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
            return inverted
          }
        }
      }

      return null
    }

    this.compositeProjection = compositeProjection as any
    return compositeProjection as any
  }

  /**
   * Get composition borders for visualization
   *
   * Note: The sub-projections have already been built with translate() applied,
   * so the projected coordinates already include baseTranslate + translateOffset.
   * We should NOT add them again here.
   *
   * @param _width - Unused, kept for API compatibility
   * @param _height - Unused, kept for API compatibility
   */
  getCompositionBorders(_width = 800, _height = 600): Array<{
    territoryCode: string
    territoryName: string
    bounds: [[number, number], [number, number]]
  }> {
    // Get primary/member code(s) to exclude from borders
    const mainlandCodes = this.config.type === 'single-focus'
      ? [this.config.mainland.code]
      : this.config.mainlands.map(m => m.code)

    return this.subProjections
      .filter(sp => sp.bounds && !mainlandCodes.includes(sp.territoryCode))
      .map((subProj) => {
        if (!subProj.bounds)
          return null

        const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds

        // Project all corners - the projection already has translate() applied
        // so these coordinates are in the final screen space
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

  /**
   * Export configuration as JSON
   * Uses parameter provider to get exportable parameters instead of reading from D3 instances
   */
  exportConfig() {
    return {
      subProjections: this.subProjections.map((sp) => {
        // Get exportable parameters from parameter provider if available
        let parameters: Partial<ProjectionParameters> = {}
        if (this.parameterProvider) {
          parameters = this.parameterProvider.getExportableParameters(sp.territoryCode)
        }
        else {
          // Fallback to D3 projection instances (legacy behavior)
          parameters = {
            center: sp.projection.center?.(),
            scale: sp.projection.scale(),
            rotate: sp.projection.rotate?.(),
            parallels: (sp.projection as any).parallels?.(),
            baseScale: sp.baseScale,
            scaleMultiplier: sp.scaleMultiplier,
          }
        }

        return {
          territoryCode: sp.territoryCode,
          territoryName: sp.territoryName,
          projectionType: sp.projectionType,
          ...parameters,
          translateOffset: sp.translateOffset,
          bounds: sp.bounds,
          clipExtent: sp.clipExtent,
        }
      }),
    }
  }
}
