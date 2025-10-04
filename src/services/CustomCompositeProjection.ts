import type { GeoProjection } from 'd3-geo'
import {
  geoAzimuthalEqualArea,
  geoAzimuthalEquidistant,
  geoConicConformal,
  geoConicEqualArea,
  geoEquirectangular,
  geoMercator,
} from 'd3-geo'
import { MAINLAND_FRANCE, OVERSEAS_TERRITORIES } from '../constants/territories'

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
 * Custom composite projection that allows individual projections per territory
 * with manual positioning (insets)
 */
export class CustomCompositeProjection {
  private subProjections: SubProjectionConfig[] = []
  private compositeProjection: GeoProjection | null = null

  constructor() {
    this.initialize()
  }

  /**
   * Initialize all sub-projections with their geographic centers and base settings
   * Uses centralized territory configuration from constants/territories.ts
   */
  private initialize() {
    // Metropolitan France - Conic Conformal
    this.addSubProjection({
      territoryCode: MAINLAND_FRANCE.code,
      territoryName: MAINLAND_FRANCE.name,
      projection: geoConicConformal()
        .center(MAINLAND_FRANCE.center)
        .scale(MAINLAND_FRANCE.scale)
        .rotate([-3, 0])
        .parallels([45.898889, 47.696014])
        .translate([0, 0]),
      baseScale: MAINLAND_FRANCE.scale,
      scaleMultiplier: 1.0,
      baseTranslate: [0, 0],
      clipExtent: null,
      translateOffset: MAINLAND_FRANCE.offset,
      bounds: MAINLAND_FRANCE.bounds,
    })

    // DOM-TOM - Use centralized configuration with improved positioning
    OVERSEAS_TERRITORIES.forEach((territory) => {
      this.addSubProjection({
        territoryCode: territory.code,
        territoryName: territory.name,
        projection: geoMercator()
          .center(territory.center)
          .scale(territory.scale)
          .translate([0, 0]),
        baseScale: territory.scale,
        scaleMultiplier: 1.0,
        baseTranslate: [0, 0],
        clipExtent: null,
        translateOffset: territory.offset,
        bounds: territory.bounds,
      })
    })
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
    // CRITICAL FIX: baseScale must NOT include the multiplier
    // currentScale = baseScale * multiplier, so we need to extract the base scale
    subProj.baseScale = currentScale / subProj.scaleMultiplier
    this.compositeProjection = null // Force rebuild
    console.log(`[CustomCompositeProjection] updateTerritoryProjection ${territoryCode}: type=${projectionType}, currentScale=${currentScale}, multiplier=${subProj.scaleMultiplier}, newBaseScale=${subProj.baseScale}`)
  }

  /**
   * Update translation offset for a territory
   */
  updateTranslationOffset(territoryCode: string, offset: [number, number]) {
    const subProj = this.subProjections.find(sp => sp.territoryCode === territoryCode)
    if (subProj) {
      console.log(`[CustomCompositeProjection] updateTranslationOffset ${territoryCode}: old=${JSON.stringify(subProj.translateOffset)}, new=${JSON.stringify(offset)}`)
      subProj.translateOffset = offset
      this.compositeProjection = null
    }
    else {
      console.warn(`[CustomCompositeProjection] updateTranslationOffset: territory ${territoryCode} not found`)
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
      console.log(`[CustomCompositeProjection] updateScale ${territoryCode}: baseScale=${subProj.baseScale}, multiplier=${scaleMultiplier}, newScale=${subProj.baseScale * scaleMultiplier}`)
    }
  }

  /**
   * Build the composite projection - albersUsa style with proper clip regions
   */
  build(width = 800, height = 600, forceRebuild = false): GeoProjection {
    console.log('[CustomCompositeProjection] build() called, cached?', this.compositeProjection !== null, 'forceRebuild?', forceRebuild)
    if (this.compositeProjection && !forceRebuild) {
      console.log('[CustomCompositeProjection] Returning cached projection')
      return this.compositeProjection
    }

    if (forceRebuild) {
      console.log('[CustomCompositeProjection] Force rebuilding projection')
    }

    console.log('[CustomCompositeProjection] Building new projection with', this.subProjections.length, 'sub-projections')
    console.log('[CustomCompositeProjection] Map dimensions:', width, 'x', height)

    // Center point for the map (France métropolitaine will be centered here)
    const centerX = width / 2
    const centerY = height / 2

    // Stats tracking
    let projectionCalls = 0
    const territoryHits = new Map<string, number>()

    // Apply translation offsets to each sub-projection (like albersUsa does)
    // The offset is applied via .translate() which moves the projection output
    const epsilon = 1e-6

    this.subProjections.forEach((subProj) => {
      // All territories are positioned relative to the map center
      // FR-MET has offset [0,0] so it will be centered
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

          console.log(`[CustomCompositeProjection] ${subProj.territoryCode}: translate=${JSON.stringify(newTranslate)}, clipExtent=${JSON.stringify([[topLeft[0], topLeft[1]], [bottomRight[0], bottomRight[1]]])}`)
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
      projectionCalls++

      if (projectionCalls <= 5) {
        console.log(`[CompositeProjection] Call #${projectionCalls}: [${lon.toFixed(2)}, ${lat.toFixed(2)}]`)
      }

      capturedPoint = null

      // Try each sub-projection's bounds
      for (const { subProj, stream } of subProjPoints) {
        if (subProj.bounds) {
          const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds

          if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
            // Track hits
            territoryHits.set(subProj.territoryCode, (territoryHits.get(subProj.territoryCode) || 0) + 1)

            // Project through stream (offset already applied in projection.translate)
            stream.point(lon, lat)

            if (capturedPoint) {
              // Offset already applied by the projection's translate!
              if (territoryHits.get(subProj.territoryCode)! <= 2) {
                console.log(`[CompositeProjection] ${subProj.territoryCode}: [${lon.toFixed(2)}, ${lat.toFixed(2)}] ->`, capturedPoint)
              }

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

    // Log stats after a delay
    setTimeout(() => {
      console.log('[CustomCompositeProjection] Projection stats:', {
        totalCalls: projectionCalls,
        territoryHits: Object.fromEntries(territoryHits),
      })
    }, 100)

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
      .filter(sp => sp.bounds && sp.territoryCode !== 'FR-MET')
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
