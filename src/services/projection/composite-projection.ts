import type { ProjectionLike, SubProjectionEntry } from '@atlas-composer/projection-core'
import type { GeoProjection } from 'd3-geo'

import type { CompositeProjectionConfig, TerritoryConfig } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { CanonicalPositioning } from '@/types/positioning'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { buildCompositeProjection, calculateClipExtentFromPixelOffset } from '@atlas-composer/projection-core'
import {
  applyCanonicalPositioning,
  extractCanonicalFromProjection,
  inferCanonicalFromLegacy,
  toPositioningFamily,
} from '@/core/positioning'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { isConicProjection } from '@/types/d3-geo-extended'
import { logger } from '@/utils/logger'

const debug = logger.projection.composite

/**
 * Parameter provider interface for dependency injection
 * Allows CompositeProjection to get dynamic parameters without direct store coupling
 */
export interface ProjectionParameterProvider {
  getEffectiveParameters: (territoryCode: TerritoryCode) => ProjectionParameters
  getExportableParameters: (territoryCode: TerritoryCode) => ProjectionParameters
  setTerritoryParameters?: (territoryCode: TerritoryCode, parameters: Partial<ProjectionParameters>) => void
}

/**
 * Configuration for a sub-projection within a composite projection
 */
interface SubProjectionConfig {
  territoryCode: TerritoryCode
  territoryName: string
  projection: GeoProjection
  projectionType: ProjectionId // Store the projection type/ID for export
  baseScale: number // Prevents scale accumulation on rebuild
  scaleMultiplier: number // Current scale multiplier (used to preserve scale when changing projection type)
  translateOffset: [number, number]
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
  private canvasDimensions?: { width: number, height: number }

  constructor(config: CompositeProjectionConfig, parameterProvider?: ProjectionParameterProvider, referenceScale?: number, canvasDimensions?: { width: number, height: number }) {
    this.config = config
    this.parameterProvider = parameterProvider
    this.referenceScale = referenceScale
    this.canvasDimensions = canvasDimensions
    // Note: canvasDimensions stored for future use and architectural consistency
    // Currently used by projection-service and map-overlay-service
    // Composite projections from d3-composite-projections have fixed internal configuration
    this.initialize()
  }

  /**
   * Get projection parameters for a territory
   * Returns parameters in canonical format (focusLongitude/focusLatitude)
   * Normalizes legacy format from config when needed
   */
  private getParametersForTerritory(territoryCode: TerritoryCode, configParams: TerritoryConfig): ProjectionParameters {
    if (this.parameterProvider) {
      const dynamicParams = this.parameterProvider.getEffectiveParameters(territoryCode)

      // Get canonical positioning from dynamic params (already normalized by parameter manager)
      // Fall back to config center if no positioning set
      let focusLongitude = dynamicParams.focusLongitude
      let focusLatitude = dynamicParams.focusLatitude
      const rotateGamma = dynamicParams.rotateGamma ?? 0

      // If no canonical positioning from provider, convert from config's legacy format
      if (focusLongitude === undefined && focusLatitude === undefined && configParams.center) {
        const canonical = inferCanonicalFromLegacy({
          center: configParams.center as [number, number],
        })
        focusLongitude = canonical.focusLongitude
        focusLatitude = canonical.focusLatitude
      }

      // Return parameters in canonical format
      return {
        focusLongitude,
        focusLatitude,
        rotateGamma,
        parallels: dynamicParams.parallels,
        scale: dynamicParams.scale, // Not used (scaleMultiplier handles scaling)
        clipAngle: dynamicParams.clipAngle,
        precision: dynamicParams.precision,
        baseScale: dynamicParams.baseScale, // Not used (referenceScale * scaleMultiplier used instead)
        scaleMultiplier: dynamicParams.scaleMultiplier ?? 1.0, // The only scale value we actually use
        pixelClipExtent: dynamicParams.pixelClipExtent, // Territory-specific clip extent
        projectionId: dynamicParams.projectionId, // CRITICAL: Must include projectionId!
      }
    }

    // No parameter provider - convert config's legacy format to canonical
    // Use projectionId directly from config if available
    if (configParams.center) {
      const canonical = inferCanonicalFromLegacy({
        center: configParams.center as [number, number],
      })
      return {
        focusLongitude: canonical.focusLongitude,
        focusLatitude: canonical.focusLatitude,
        rotateGamma: 0,
        parallels: undefined,
        scale: undefined,
        clipAngle: undefined,
        precision: undefined,
        projectionId: configParams.projectionId,
      }
    }

    return {
      projectionId: configParams.projectionId,
    }
  }

  /**
   * Get canonical positioning from parameters
   *
   * Extracts the geographic focus point from parameters.
   * Parameters should already be in canonical format from getParametersForTerritory.
   */
  private getCanonicalPositioning(params: ProjectionParameters): CanonicalPositioning {
    return {
      focusLongitude: params.focusLongitude ?? 0,
      focusLatitude: params.focusLatitude ?? 0,
      rotateGamma: params.rotateGamma ?? 0,
    }
  }

  /**
   * Apply positioning parameters to a projection based on its family.
   *
   * This method uses the CANONICAL POSITIONING format (focusLongitude/focusLatitude)
   * and converts to the appropriate D3 method based on projection family:
   *
   * - CYLINDRICAL: Uses center() directly
   * - CONIC/AZIMUTHAL: Uses rotate() with negated coordinates
   * - OTHER: Uses rotate() as default
   *
   * The canonical format eliminates the need for runtime coordinate conversions
   * and ensures the store always has consistent values regardless of projection family.
   */
  private applyPositioningParameters(
    projection: GeoProjection,
    projectionType: string,
    params: ProjectionParameters,
    _territoryCode?: string,
  ): void {
    const projectionDef = projectionRegistry.get(projectionType)
    const family = toPositioningFamily(projectionDef?.family)

    // Get canonical positioning (projection-agnostic format)
    const canonical = this.getCanonicalPositioning(params)

    // Apply canonical positioning using the positioning module
    applyCanonicalPositioning(projection, canonical, family)

    // Apply parallels if supported (conic projections)
    if (isConicProjection(projection)) {
      if (params.parallels) {
        projection.parallels(params.parallels)
      }
      else {
        // Derive parallels from focus latitude if not provided
        const centerLat = canonical.focusLatitude
        if (centerLat !== 0) {
          const parallels: [number, number] = [centerLat - 2, centerLat + 2]
          projection.parallels(parallels)
        }
      }
    }
  }

  /**
   * Initialize all sub-projections with their geographic centers and base settings
   * Uses provided configuration for territories
   *
   * This implementation follows d3-composite-projections approach:
   * 1. Use a single reference scale for all projections
   * 2. Apply territory-specific scale multipliers from presets
   * 3. The multipliers ensure proper visual composition while maintaining proportionality
   */
  private initialize() {
    this.initializeTerritories()
  }

  /**
   * Initialize all territories equally - no hierarchy distinction
   */
  private initializeTerritories() {
    const { territories } = this.config

    // Reference scale for all territories
    // Use preset referenceScale if provided, or default to 2700
    const REFERENCE_SCALE = this.referenceScale ?? 2700

    // Process all territories equally - no special treatment
    territories.forEach((territory) => {
      // Get parameters from parameter provider (required - no fallback to config)
      const territoryParams = this.getParametersForTerritory(territory.code as TerritoryCode, territory)

      // Skip territories without projectionId (not in preset)
      if (!territoryParams.projectionId) {
        debug('Skipping territory %s - not defined in preset (projectionId missing)', territory.code)
        return
      }

      // Projection type must come from parameters/preset
      const projectionType = territoryParams.projectionId
      const projection = this.createProjectionByType(projectionType)
        .translate([0, 0])

      // Apply positioning parameters based on projection family
      this.applyPositioningParameters(projection, projectionType, territoryParams, territory.code)

      // Apply parallels if supported and provided
      if (isConicProjection(projection) && territoryParams.parallels) {
        projection.parallels(territoryParams.parallels)
      }

      // Determine scale values
      // baseScale always comes from referenceScale (not from preset)
      // scaleMultiplier comes from preset parameter store (defaults to 1.0)
      const territoryBaseScale = REFERENCE_SCALE
      const territoryScaleMultiplier = territoryParams.scaleMultiplier ?? 1.0

      projection.scale(territoryBaseScale * territoryScaleMultiplier)

      // Get translateOffset from parameters
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

  /**
   * Create a projection instance by type name
   */
  private createProjectionByType(projectionType: string): GeoProjection {
    const projection = ProjectionFactory.createById(projectionType)
    if (projection) {
      return projection
    }

    // Fallback to mercator if projection creation fails
    debug('Failed to create projection: %s, falling back to Mercator', projectionType)
    return ProjectionFactory.createById('mercator')!
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
   * Preserves scale and translate from the existing projection
   * Resets positioning parameters (center/rotate) when switching between projection families
   */
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

    // Detect old and new projection families using registry
    const oldDef = projectionRegistry.get(subProj.projectionType)
    const newDef = projectionRegistry.get(projectionType)
    const oldFamily = oldDef?.family || 'OTHER'
    const newFamily = newDef?.family || 'OTHER'
    const familyChanged = oldFamily !== newFamily

    // Check if we have custom positioning parameters in the store
    const exportableParams = this.parameterProvider?.getExportableParameters(territoryCode) || {}
    const hasCustomPositioning
      = (exportableParams.center !== undefined && exportableParams.center !== null)
        || (exportableParams.rotate !== undefined && exportableParams.rotate !== null)

    // Get current scaleMultiplier from store (may have been updated before this call)
    const storeParams = this.parameterProvider?.getEffectiveParameters(territoryCode)
    const storeScaleMultiplier = storeParams?.scaleMultiplier ?? subProj.scaleMultiplier

    // Save current settings BEFORE updating subProj
    const currentScale = subProj.projection.scale()
    const currentTranslate = subProj.projection.translate()
    const oldScaleMultiplier = subProj.scaleMultiplier

    // Create new projection using ProjectionFactory
    const factoryProjection = ProjectionFactory.createById(projectionType)
    if (!factoryProjection) {
      debug('Failed to create projection: %s', projectionType)
      return
    }

    const newProjection = factoryProjection

    // Restore translate (always preserve)
    newProjection.translate(currentTranslate)

    // ALWAYS sync scaleMultiplier from store - the store may have been updated
    // (e.g., during reset) before this method is called
    subProj.scaleMultiplier = storeScaleMultiplier

    // Scale handling: use store value when changing families or when scaleMultiplier changed
    // Compare store value with OLD multiplier (not the updated one)
    const scaleMultiplierChanged = Math.abs(storeScaleMultiplier - oldScaleMultiplier) > 0.01
    if (familyChanged || scaleMultiplierChanged) {
      // Apply scale from store (baseScale * scaleMultiplier)
      const newScale = subProj.baseScale * subProj.scaleMultiplier
      newProjection.scale(newScale)
    }
    else {
      // Preserve scale when staying in same family with same multiplier
      newProjection.scale(currentScale)
    }

    if (familyChanged) {
      // Family changed - reset positioning parameters to prevent CONIC rotation
      // from affecting CYLINDRICAL center, etc.
      debug('Family changed from %s to %s for %s - resetting positioning parameters', oldFamily, newFamily, territoryCode)

      // Check if we have custom positioning parameters in the store
      // If we do, we want to preserve the visual position
      // If we don't (i.e. using defaults), we should let defaults take over

      if (hasCustomPositioning) {
        // Extract current position and apply to new projection using canonical format
        const currentCanonical = extractCanonicalFromProjection(
          subProj.projection,
          toPositioningFamily(oldFamily),
        )

        // Apply canonical positioning to new projection
        applyCanonicalPositioning(
          newProjection,
          currentCanonical,
          toPositioningFamily(newFamily),
        )

        // Apply default parallels for conic projections
        if (newFamily === ProjectionFamily.CONIC && isConicProjection(newProjection)) {
          newProjection.parallels([currentCanonical.focusLatitude - 2, currentCanonical.focusLatitude + 2])
        }
      }
    }
    else {
      // Family unchanged - restore positioning parameters from old projection
      const currentCenter = subProj.projection.center ? subProj.projection.center() : null
      const currentRotate = subProj.projection.rotate ? subProj.projection.rotate() : null

      if (currentCenter && newProjection.center) {
        newProjection.center(currentCenter)
      }
      if (currentRotate && newProjection.rotate) {
        newProjection.rotate(currentRotate)
      }

      // Apply parallels for conic projections if center is available
      if (currentCenter && (projectionType.includes('conic') || projectionType === 'albers')) {
        if (isConicProjection(newProjection)) {
          newProjection.parallels([currentCenter[1] - 2, currentCenter[1] + 2])
        }
      }
    }

    // Update the projection
    subProj.projection = newProjection
    subProj.projectionType = projectionType

    // If family changed and we didn't preserve custom parameters, apply defaults
    if (familyChanged && !hasCustomPositioning) {
      this.updateTerritoryParameters(territoryCode)
    }

    this.compositeProjection = null // Force rebuild
  }

  /**
   * Update translation offset for a territory
   */
  updateTranslationOffset(territoryCode: TerritoryCode, offset: [number, number]) {
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (subProj) {
      subProj.translateOffset = offset
      this.compositeProjection = null
    }
  }

  /**
   * Get canvas dimensions (if set)
   */
  getCanvasDimensions(): { width: number, height: number } | undefined {
    return this.canvasDimensions
  }

  /**
   * Update reference scale and apply to all territories
   * @param newReferenceScale - New reference scale value
   */
  updateReferenceScale(newReferenceScale: number): void {
    this.referenceScale = newReferenceScale

    // Update scale for all sub-projections
    this.subProjections.forEach((subProj) => {
      // Recalculate scale using new reference scale
      const referenceScale = this.referenceScale ?? 2700
      const newScale = referenceScale * subProj.scaleMultiplier

      // Update the projection scale
      if (typeof subProj.projection.scale === 'function') {
        subProj.projection.scale(newScale)
      }

      // Update baseScale to match
      subProj.baseScale = newScale
    })

    // Force rebuild of composite projection on next build() call
    this.compositeProjection = null
  }

  /**
   * Update scale for a territory
   */
  updateScale(territoryCode: TerritoryCode, scaleMultiplier: number) {
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (subProj) {
      // Check if user has manually overridden the scale parameter
      if (this.parameterProvider) {
        const params = this.parameterProvider.getEffectiveParameters(territoryCode)
        const expectedScale = subProj.baseScale * subProj.scaleMultiplier

        // If params.scale exists and differs from expected scale, user has overridden it
        // We should not overwrite it with the multiplier
        if (params.scale !== undefined && Math.abs(params.scale - expectedScale) > 0.1) {
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
   *
   * Uses canonical positioning format (focusLongitude/focusLatitude) to apply
   * positioning parameters to the projection. The canonical format is projection-
   * agnostic and converted to the appropriate D3 method based on projection family.
   */
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

    try {
      const params = this.parameterProvider.getEffectiveParameters(territoryCode)
      const projection = subProj.projection

      if (!projection) {
        return
      }

      // Get projection family from registry
      const projectionDef = projectionRegistry.get(subProj.projectionType)
      const family = toPositioningFamily(projectionDef?.family)

      // Get canonical positioning and apply to projection
      const canonical = this.getCanonicalPositioning(params)
      applyCanonicalPositioning(projection, canonical, family)

      // Apply parallels if supported (conic projections)
      if (isConicProjection(projection)) {
        if (params.parallels) {
          const parallels = params.parallels as [number, number]
          if (Array.isArray(parallels) && parallels.length === 2) {
            projection.parallels(parallels)
          }
        }
        else {
          // Derive parallels from focus latitude if not provided
          if (canonical.focusLatitude !== 0) {
            const derivedParallels: [number, number] = [canonical.focusLatitude - 2, canonical.focusLatitude + 2]
            projection.parallels(derivedParallels)
          }
        }
      }

      // Update scaleMultiplier from params if provided
      if (params.scaleMultiplier !== undefined && typeof params.scaleMultiplier === 'number' && !Number.isNaN(params.scaleMultiplier)) {
        subProj.scaleMultiplier = params.scaleMultiplier
      }

      // Re-apply scale after updating parameters
      // Some D3 projections may reset scale when rotate/center/parallels are changed
      const correctScale = subProj.baseScale * subProj.scaleMultiplier
      projection.scale(correctScale)

      // Apply precision if supported
      if (projection.precision && params.precision !== undefined && typeof params.precision === 'number') {
        projection.precision(params.precision)
      }

      // Force rebuild of composite projection
      this.compositeProjection = null
    }
    catch (error) {
      debug('Error updating parameters for territory %s: %o', territoryCode, error)
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
      // Get translateOffset from parameter provider (or fallback to stored config)
      const parameterProvider = this.parameterProvider
      let translateOffset: [number, number] = subProj.translateOffset
      if (parameterProvider) {
        const params = parameterProvider.getEffectiveParameters(subProj.territoryCode)
        if (params.translateOffset) {
          translateOffset = params.translateOffset as [number, number]
        }
      }

      // All territories are positioned relative to the map center
      // Mainland has offset [0,0] or close to it, so it will be centered
      // Others have their configured offsets relative to center
      const newTranslate: [number, number] = [
        centerX + translateOffset[0],
        centerY + translateOffset[1],
      ]
      subProj.projection.translate(newTranslate)

      // Handle pixelClipExtent from parameter provider
      if (parameterProvider) {
        const params = parameterProvider.getEffectiveParameters(subProj.territoryCode)
        if (params.pixelClipExtent && Array.isArray(params.pixelClipExtent) && params.pixelClipExtent.length === 4) {
          const territoryCenter = newTranslate // Territory position already calculated above

          // Use core utility for clip extent calculation
          const clipExtentScreen = calculateClipExtentFromPixelOffset(
            territoryCenter,
            params.pixelClipExtent as [number, number, number, number],
          )

          subProj.projection.clipExtent(clipExtentScreen)
        }
      }
      // Otherwise, calculate clipExtent from geographic bounds
      if (!parameterProvider || !parameterProvider.getEffectiveParameters(subProj.territoryCode).pixelClipExtent) {
        if (subProj.bounds) {
          const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds

          // Project the bounds corners to get clip extent in screen coordinates
          const topLeft = subProj.projection([minLon + epsilon, maxLat - epsilon])
          const bottomRight = subProj.projection([maxLon - epsilon, minLat + epsilon])

          if (topLeft && bottomRight) {
            // Set clip extent (already in final coordinate space thanks to translate)
            const clipExtent: [[number, number], [number, number]] = [
              [topLeft[0], topLeft[1]],
              [bottomRight[0], bottomRight[1]],
            ]
            subProj.projection.clipExtent(clipExtent)
          }
        }
      }
    })

    // Convert sub-projections to SubProjectionEntry format for core builder
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

    // Use projection-core to build the composite projection
    const compositeProjection = buildCompositeProjection({ entries })

    this.compositeProjection = compositeProjection as any
    return compositeProjection as any
  }

  /**
   * Get composition borders for visualization
   *
   * Note: The sub-projections have already been built with translate() applied,
   * so the projected coordinates already include translateOffset.
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
    return this.subProjections
      .filter(sp => sp.bounds)
      .map((subProj) => {
        // Get the current clipExtent as applied to the projection (from pixelClipExtent parameter)
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

        // Fallback to geographic bounds if no clipExtent parameter
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
   * Uses parameter provider to get exportable parameters
   */
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
          translateOffset: sp.translateOffset,
          bounds: sp.bounds,
        }
      }),
    }
  }

  /**
   * Get effective scales for all territories
   *
   * Returns the actual scale value used by each territory's projection.
   * This is calculated as: baseScale * scaleMultiplier
   *
   * Used by GraticuleOverlayService to determine appropriate graticule
   * density for each territory in composite projections.
   *
   * @returns Map of territory code to effective scale value
   */
  getEffectiveScales(): Map<string, number> {
    const scales = new Map<string, number>()

    for (const subProj of this.subProjections) {
      // Get the current scale from the projection
      const projectionScale = subProj.projection.scale?.() ?? 1000

      // Alternatively, calculate from stored values
      const calculatedScale = subProj.baseScale * subProj.scaleMultiplier

      // Use projection scale if available, otherwise calculated
      const effectiveScale = projectionScale || calculatedScale

      scales.set(subProj.territoryCode, effectiveScale)
    }

    return scales
  }

  /**
   * Get effective scale for a single territory
   *
   * @param territoryCode - Territory code to get scale for
   * @returns Effective scale value or undefined if territory not found
   */
  getEffectiveScale(territoryCode: TerritoryCode): number | undefined {
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (!subProj) {
      return undefined
    }

    return subProj.projection.scale?.() ?? (subProj.baseScale * subProj.scaleMultiplier)
  }

  /**
   * Get sub-projection data for a territory
   * Used for efficient graticule rendering where each territory uses its own projection
   *
   * @param territoryCode - Territory code
   * @returns Sub-projection data or undefined if not found
   */
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

  /**
   * Get all sub-projection data for graticule rendering
   * More efficient than using the composite projection for each territory
   *
   * @returns Array of sub-projection data
   */
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
