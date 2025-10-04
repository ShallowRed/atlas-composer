import type { GeoProjection, GeoStream } from 'd3-geo'
import {
  geoAzimuthalEqualArea,
  geoAzimuthalEquidistant,
  geoConicConformal,
  geoConicEqualArea,
  geoEquirectangular,
  geoMercator,
  geoProjection,
} from 'd3-geo'

/**
 * Configuration for a sub-projection within a composite projection
 */
interface SubProjectionConfig {
  territoryCode: string
  territoryName: string
  projection: GeoProjection
  baseScale: number // Base scale value (before multiplier)
  clipExtent: [[number, number], [number, number]] | null
  translateOffset: [number, number] // Offset in screen coordinates
  bounds?: [[number, number], [number, number]] // Geographic bounds [min, max]
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
   * Initialize with default configuration
   */
  private initialize() {
    // Metropolitan France - Conic Conformal
    this.addSubProjection({
      territoryCode: 'FR-MET',
      territoryName: 'France Métropolitaine',
      projection: geoConicConformal()
        .center([2.5, 46.5])
        .scale(2800)
        .rotate([-3, 0])
        .parallels([45.898889, 47.696014])
        .translate([0, 0]), // Local projection center
      baseScale: 2800, // Store base scale for multiplier application
      clipExtent: null, // Don't clip, use bounds for geographic filtering
      translateOffset: [0, 0], // Center of the composite map
      bounds: [[-5, 41], [10, 51]], // Geographic bounds for France
    })

    // Default configuration for DOM-TOM (will be updated dynamically)
    const domtomDefaults = [
      {
        code: 'FR-GP',
        name: 'Guadeloupe',
        center: [-61.551, 16.265] as [number, number],
        scale: 18000,
        offset: [-400, 100] as [number, number],
        bounds: [[-61.81, 15.83], [-61.0, 16.52]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-MQ',
        name: 'Martinique',
        center: [-61.024, 14.642] as [number, number],
        scale: 20000,
        offset: [-400, 200] as [number, number],
        bounds: [[-61.23, 14.39], [-60.81, 14.88]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-GF',
        name: 'Guyane',
        center: [-53.1, 3.9] as [number, number],
        scale: 2200,
        offset: [-400, 300] as [number, number],
        bounds: [[-54.6, 2.1], [-51.6, 5.8]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-RE',
        name: 'La Réunion',
        center: [55.536, -21.115] as [number, number],
        scale: 18000,
        offset: [300, 100] as [number, number],
        bounds: [[55.22, -21.39], [55.84, -20.87]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-YT',
        name: 'Mayotte',
        center: [45.166, -12.827] as [number, number],
        scale: 35000,
        offset: [350, 200] as [number, number],
        bounds: [[44.98, -13.0], [45.3, -12.64]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-NC',
        name: 'Nouvelle-Calédonie',
        center: [165.618, -20.904] as [number, number],
        scale: 3000,
        offset: [450, -100] as [number, number],
        bounds: [[163.0, -22.7], [168.0, -19.5]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-PF',
        name: 'Polynésie française',
        center: [-149.566, -17.679] as [number, number],
        scale: 8000,
        offset: [450, 100] as [number, number],
        bounds: [[-154, -28], [-134, -7]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-MF',
        name: 'Saint-Martin',
        center: [-63.082, 18.067] as [number, number],
        scale: 40000,
        offset: [-350, 80] as [number, number],
        bounds: [[-63.15, 18.04], [-63.0, 18.13]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-WF',
        name: 'Wallis-et-Futuna',
        center: [-176.176, -13.768] as [number, number],
        scale: 35000,
        offset: [400, 250] as [number, number],
        bounds: [[-178.2, -14.4], [-176.1, -13.2]] as [[number, number], [number, number]],
      },
      {
        code: 'FR-PM',
        name: 'Saint-Pierre-et-Miquelon',
        center: [-56.327, 46.885] as [number, number],
        scale: 25000,
        offset: [-100, -200] as [number, number],
        bounds: [[-56.42, 46.75], [-56.13, 47.15]] as [[number, number], [number, number]],
      },
    ]

    domtomDefaults.forEach((config) => {
      this.addSubProjection({
        territoryCode: config.code,
        territoryName: config.name,
        projection: geoMercator()
          .center(config.center)
          .scale(config.scale)
          .translate([0, 0]),
        baseScale: config.scale, // Store base scale for multiplier application
        clipExtent: null, // Will be computed based on bounds
        translateOffset: config.offset,
        bounds: config.bounds as [[number, number], [number, number]],
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

    // Update the projection and base scale
    subProj.projection = newProjection
    subProj.baseScale = currentScale // New base scale is current scale (preserves visual size)
    this.compositeProjection = null // Force rebuild
    console.log(`[CustomCompositeProjection] updateTerritoryProjection ${territoryCode}: type=${projectionType}, newBaseScale=${currentScale}`)
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
      // Apply multiplier to base scale (not current scale to avoid accumulation)
      subProj.projection.scale(subProj.baseScale * scaleMultiplier)
      this.compositeProjection = null
      console.log(`[CustomCompositeProjection] updateScale ${territoryCode}: baseScale=${subProj.baseScale}, multiplier=${scaleMultiplier}, newScale=${subProj.baseScale * scaleMultiplier}`)
    }
  }

  /**
   * Build the composite projection
   */
  build(width = 800, height = 600): GeoProjection {
    if (this.compositeProjection) {
      console.log('[CustomCompositeProjection] Returning cached projection')
      return this.compositeProjection
    }

    console.log('[CustomCompositeProjection] Building new projection with', this.subProjections.length, 'sub-projections')
    console.log('[CustomCompositeProjection] Sub-projections:', this.subProjections.map(sp => ({
      code: sp.territoryCode,
      offset: sp.translateOffset,
      scale: sp.projection.scale(),
    })))

    const baseTranslate: [number, number] = [width / 2, height / 2]

    // Create the projection function
    const projectFn = (coordinates: [number, number] | null): [number, number] | null => {
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
        return null
      }

      const [lon, lat] = coordinates

      // Try each sub-projection in sequence
      for (const subProj of this.subProjections) {
        // Check if point is within bounds
        if (subProj.bounds) {
          const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds
          if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
            const projected = subProj.projection([lon, lat])
            if (projected) {
              // Apply base translation and offset
              return [
                projected[0] + baseTranslate[0] + subProj.translateOffset[0],
                projected[1] + baseTranslate[1] + subProj.translateOffset[1],
              ]
            }
          }
        }
      }

      return null
    }

    // Create the invert function
    projectFn.invert = (coordinates: [number, number] | null): [number, number] | null => {
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
        return null
      }

      const [x, y] = coordinates

      // Try each sub-projection in reverse
      for (const subProj of this.subProjections) {
        // Remove base translation and offset
        const adjustedX = x - baseTranslate[0] - subProj.translateOffset[0]
        const adjustedY = y - baseTranslate[1] - subProj.translateOffset[1]

        const inverted = subProj.projection.invert?.([adjustedX, adjustedY])
        if (inverted) {
          // Check if result is within bounds
          if (subProj.bounds) {
            const [lon, lat] = inverted
            const [[minLon, minLat], [maxLon, maxLat]] = subProj.bounds
            if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
              return inverted
            }
          }
          else {
            return inverted
          }
        }
      }

      return null
    }

    // Create the composite projection
    const projection = geoProjection(projectFn as any)
      .translate(baseTranslate)
      .scale(1) // Scale is handled by sub-projections

    // Create composite stream (multiplexing)
    projection.stream = (sink: GeoStream) => {
      const streams = this.subProjections.map(subProj =>
        subProj.projection.stream(sink),
      )

      return {
        point(x: number, y: number) {
          streams.forEach(s => s.point(x, y))
        },
        lineStart() {
          streams.forEach(s => s.lineStart())
        },
        lineEnd() {
          streams.forEach(s => s.lineEnd())
        },
        polygonStart() {
          streams.forEach(s => s.polygonStart())
        },
        polygonEnd() {
          streams.forEach(s => s.polygonEnd())
        },
        sphere() {
          streams.forEach(s => s.sphere?.())
        },
      }
    }

    this.compositeProjection = projection
    return projection
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
