import type { GeoProjection } from 'd3-geo'
import {
  geoAzimuthalEqualArea,
  geoAzimuthalEquidistant,
  geoConicConformal,
  geoConicEqualArea,
  geoEquirectangular,
  geoMercator,
} from 'd3-geo'

/**
 * Configuration for a sub-projection within a composite projection
 */
interface SubProjectionConfig {
  territoryCode: string
  territoryName: string
  projection: GeoProjection
  baseScale: number // Prevents scale accumulation on rebuild
  scaleMultiplier: number // Current scale multiplier (used to preserve scale when changing projection type)
  baseTranslate: [number, number] // Prevents translation accumulation on rebuild
  translateOffset: [number, number]
  clipExtent: [[number, number], [number, number]] | null
  bounds?: [[number, number], [number, number]]
}

/**
 * Configuration for initializing a composite projection
 */
export interface CompositeProjectionConfig {
  mainland: TerritoryConfig
  overseasTerritories: TerritoryConfig[]
}

/**
 * Custom composite projection that allows individual projections per territory
 * with manual positioning (insets)
 */
export class CustomCompositeProjection {
  private subProjections: SubProjectionConfig[] = []
  private compositeProjection: GeoProjection | null = null
  private config: CompositeProjectionConfig

  constructor(config: CompositeProjectionConfig) {
    this.config = config
    this.initialize()
  }

  /**
   * Initialize all sub-projections with their geographic centers and base settings
   * Uses provided configuration for territories
   */
  private initialize() {
    const { mainland, overseasTerritories } = this.config

    // Calculate mainland geographic extent to use as reference
    const mainlandExtent = this.calculateGeographicExtent(mainland.bounds)

    // Mainland territory - use projection type from config if available, otherwise default to Conic Conformal
    const mainlandProjectionType = mainland.projectionType || 'conic-conformal'
    const mainlandProjection = this.createProjectionByType(mainlandProjectionType)
      .center(mainland.center)
      .translate([0, 0])

    // Apply rotation if supported and provided in config
    if (mainlandProjection.rotate && mainland.rotate) {
      mainlandProjection.rotate(mainland.rotate as [number, number] | [number, number, number])
    }

    // Apply parallels if supported and provided in config
    if ((mainlandProjection as any).parallels && mainland.parallels) {
      (mainlandProjection as any).parallels(mainland.parallels)
    }

    // Calculate scale for mainland using a standard reference size
    const mainlandScale = this.calculateProportionalScale(mainlandProjection, mainland.bounds, mainlandExtent)
    mainlandProjection.scale(mainlandScale)

    this.addSubProjection({
      territoryCode: mainland.code,
      territoryName: mainland.name,
      projection: mainlandProjection,
      baseScale: mainlandScale,
      scaleMultiplier: 1.0,
      baseTranslate: [0, 0],
      clipExtent: null,
      translateOffset: mainland.offset,
      bounds: mainland.bounds,
    })

    // Overseas territories - use projection type from config if available, otherwise default to Mercator
    overseasTerritories.forEach((territory) => {
      const projectionType = territory.projectionType || 'mercator'
      const projection = this.createProjectionByType(projectionType)
        .center(territory.center)
        .translate([0, 0])

      // Calculate scale proportional to mainland (territories maintain relative geographic sizes)
      const territoryScale = this.calculateProportionalScale(projection, territory.bounds, mainlandExtent)
      projection.scale(territoryScale)

      this.addSubProjection({
        territoryCode: territory.code,
        territoryName: territory.name,
        projection,
        baseScale: territoryScale,
        scaleMultiplier: 1.0,
        baseTranslate: [0, 0],
        clipExtent: null,
        translateOffset: territory.offset,
        bounds: territory.bounds,
      })
    })
  }

  /**
   * Calculate the geographic extent (max span) of bounds
   */
  private calculateGeographicExtent(bounds: [[number, number], [number, number]]): number {
    const [[minLon, minLat], [maxLon, maxLat]] = bounds
    const lonSpan = maxLon - minLon
    const latSpan = maxLat - minLat
    return Math.max(lonSpan, latSpan)
  }

  /**
   * Detect projection family from the projection instance
   */
  private getProjectionFamily(projection: GeoProjection): 'conic' | 'mercator' | 'azimuthal' | 'other' {
    // Check for conic projections (they have parallels method)
    if ((projection as any).parallels) {
      return 'conic'
    }
    // Check for center method (typical for mercator and azimuthal)
    if (typeof projection.center === 'function') {
      // Most mercator-family projections have these characteristics
      return 'mercator'
    }
    return 'other'
  }

  /**
   * Calculate scale proportional to geographic extent
   * This ensures territories maintain their relative geographic sizes
   *
   * The formula ensures that territories are sized proportionally based on their
   * geographic extent, using the same logic as the original implementation.
   *
   * @param projection - The projection to calculate scale for
   * @param bounds - Geographic bounds of the territory
   * @param _referenceExtent - Not used, kept for API compatibility
   * @returns Calculated scale value
   */
  private calculateProportionalScale(
    projection: GeoProjection,
    bounds: [[number, number], [number, number]],
    _referenceExtent: number,
  ): number {
    // Calculate this territory's geographic extent
    const territoryExtent = this.calculateGeographicExtent(bounds)

    // Get projection family to apply appropriate scaling formula
    const projectionFamily = this.getProjectionFamily(projection)

    // Base constant for scale calculation
    // For conic: 42000 / 15° ≈ 2800 for mainland France
    const BASE_CONSTANT = 42000

    if (projectionFamily === 'conic') {
      // Conic projections: scale inversely proportional to max span
      return BASE_CONSTANT / territoryExtent
    }
    else {
      // Mercator and other projections need adjustment
      // Mercator at mid-latitudes needs ~4x smaller scale than Conic
      // to produce proportional output
      return (BASE_CONSTANT / territoryExtent) * 0.25
    }
  } /**
     * Create a projection instance by type name
     */

  private createProjectionByType(projectionType: string): GeoProjection {
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
        return geoMercator()
    }
  }

  /**
   * Add or update a sub-projection configuration
   */
  addSubProjection(config: SubProjectionConfig) {
    const existingIndex = this.subProjections.findIndex(
      sp => sp.territoryCode === config.territoryCode,
    )

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
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (!subProj)
      return

    // Save current settings
    const currentScale = subProj.projection.scale()
    const currentCenter = subProj.projection.center ? subProj.projection.center() : null
    const currentRotate = subProj.projection.rotate ? subProj.projection.rotate() : null
    const currentTranslate = subProj.projection.translate()

    // Create new projection based on type
    let newProjection: GeoProjection

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
        newProjection = geoMercator()
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
    // currentScale = baseScale * multiplier, so we need to extract the base scale
    subProj.baseScale = currentScale / subProj.scaleMultiplier
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
      // Store the multiplier so it's preserved when changing projection type
      subProj.scaleMultiplier = scaleMultiplier
      // Apply multiplier to base scale (not current scale to avoid accumulation)
      subProj.projection.scale(subProj.baseScale * scaleMultiplier)
      this.compositeProjection = null
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
      // All territories are positioned relative to the map center
      // Mainland has offset [0,0] or close to it, so it will be centered
      // Others have their configured offsets relative to center
      const newTranslate: [number, number] = [
        centerX + subProj.translateOffset[0],
        centerY + subProj.translateOffset[1],
      ]
      subProj.projection.translate(newTranslate)

      if (subProj.bounds) {
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
      for (const subProj of this.subProjections) {
        const adjustedX = x - subProj.translateOffset[0]
        const adjustedY = y - subProj.translateOffset[1]

        const inverted = subProj.projection.invert?.([adjustedX, adjustedY])
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
   */
  getCompositionBorders(width = 800, height = 600): Array<{
    territoryCode: string
    territoryName: string
    bounds: [[number, number], [number, number]]
  }> {
    const baseTranslate: [number, number] = [width / 2, height / 2]

    return this.subProjections
      .filter(sp => sp.bounds && sp.territoryCode !== this.config.mainland.code)
      .map((subProj) => {
        if (!subProj.bounds)
          return null

        const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds

        // Project all corners
        const topLeft = subProj.projection([minLon, maxLat])
        const bottomRight = subProj.projection([maxLon, minLat])

        if (!topLeft || !bottomRight)
          return null

        return {
          territoryCode: subProj.territoryCode,
          territoryName: subProj.territoryName,
          bounds: [
            [
              topLeft[0] + baseTranslate[0] + subProj.translateOffset[0],
              topLeft[1] + baseTranslate[1] + subProj.translateOffset[1],
            ],
            [
              bottomRight[0] + baseTranslate[0] + subProj.translateOffset[0],
              bottomRight[1] + baseTranslate[1] + subProj.translateOffset[1],
            ],
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
   */
  exportConfig() {
    return {
      subProjections: this.subProjections.map(sp => ({
        territoryCode: sp.territoryCode,
        territoryName: sp.territoryName,
        projectionType: sp.projection.constructor.name,
        center: sp.projection.center?.(),
        scale: sp.projection.scale(),
        rotate: sp.projection.rotate?.(),
        translateOffset: sp.translateOffset,
        bounds: sp.bounds,
      })),
    }
  }
}
