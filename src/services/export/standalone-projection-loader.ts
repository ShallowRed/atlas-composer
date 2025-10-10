/**
 * Standalone Composite Projection Loader
 *
 * This is a pure JavaScript/TypeScript module that can consume exported
 * composite projection configurations and create D3 projections.
 *
 * Can be extracted as a standalone npm package.
 *
 * Dependencies: d3-geo, d3-geo-projection
 *
 * @packageDocumentation
 */

import type { GeoProjection } from 'd3-geo'
import * as d3Geo from 'd3-geo'
import * as d3GeoProjection from 'd3-geo-projection'

/**
 * Exported configuration format (subset needed for loading)
 */
export interface ExportedConfig {
  version: string
  metadata: {
    atlasId: string
    atlasName: string
  }
  pattern: string
  referenceScale: number
  territories: Territory[]
}

export interface Territory {
  code: string
  name: string
  role: string
  projectionId: string
  projectionFamily: string
  parameters: ProjectionParameters
  layout: Layout
  bounds: [[number, number], [number, number]]
}

export interface ProjectionParameters {
  center?: [number, number]
  rotate?: [number, number, number]
  scale: number
  baseScale: number
  scaleMultiplier: number
  parallels?: [number, number]
}

export interface Layout {
  translateOffset: [number, number]
  clipExtent: [[number, number], [number, number]] | null
}

/**
 * Options for creating the composite projection
 */
export interface LoaderOptions {
  /** Canvas width in pixels */
  width: number
  /** Canvas height in pixels */
  height: number
  /** Whether to apply clipping to territories (default: true) */
  enableClipping?: boolean
  /** Debug mode - logs territory selection (default: false) */
  debug?: boolean
}

/**
 * Map projection IDs to D3 projection factory functions
 */
const PROJECTION_FACTORIES: Record<string, () => any> = {
  // Azimuthal
  'azimuthal-equal-area': () => d3Geo.geoAzimuthalEqualArea(),
  'azimuthal-equidistant': () => d3Geo.geoAzimuthalEquidistant(),
  'gnomonic': () => d3Geo.geoGnomonic(),
  'orthographic': () => d3Geo.geoOrthographic(),
  'stereographic': () => d3Geo.geoStereographic(),

  // Conic
  'conic-conformal': () => d3Geo.geoConicConformal(),
  'conic-equal-area': () => d3Geo.geoConicEqualArea(),
  'conic-equidistant': () => d3Geo.geoConicEquidistant(),
  'albers': () => d3Geo.geoAlbers(),

  // Cylindrical
  'mercator': () => d3Geo.geoMercator(),
  'transverse-mercator': () => d3Geo.geoTransverseMercator(),
  'equirectangular': () => d3Geo.geoEquirectangular(),
  'natural-earth-1': () => (d3GeoProjection as any).geoNaturalEarth1(),

  // Other
  'equal-earth': () => d3Geo.geoEqualEarth(),
}

/**
 * Create a D3 projection from an exported composite projection configuration
 *
 * @example
 * ```javascript
 * import { loadCompositeProjection } from './standalone-projection-loader'
 *
 * // Load configuration from JSON file or string
 * const config = JSON.parse(jsonString)
 *
 * // Create projection
 * const projection = loadCompositeProjection(config, {
 *   width: 800,
 *   height: 600
 * })
 *
 * // Use with D3
 * const path = d3.geoPath(projection)
 * svg.selectAll('path')
 *   .data(countries.features)
 *   .join('path')
 *   .attr('d', path)
 * ```
 *
 * @param config - Exported composite projection configuration
 * @param options - Canvas dimensions and options
 * @returns D3 GeoProjection that routes geometry to appropriate sub-projections
 */
export function loadCompositeProjection(
  config: ExportedConfig,
  options: LoaderOptions,
): GeoProjection {
  const { width, height, debug = false } = options

  // Validate configuration version
  if (config.version !== '1.0') {
    throw new Error(`Unsupported configuration version: ${config.version}`)
  }

  if (!config.territories || config.territories.length === 0) {
    throw new Error('Configuration must contain at least one territory')
  }

  // Create sub-projections for each territory
  const subProjections = config.territories.map((territory) => {
    const proj = createSubProjection(territory, width, height)

    return {
      territory,
      projection: proj,
      bounds: territory.bounds,
    }
  })

  if (debug) {
    console.log('[CompositeProjection] Created sub-projections:', {
      territories: config.territories.map(t => ({ code: t.code, name: t.name })),
      count: subProjections.length,
    })
  }

  // Create composite projection using D3 stream multiplexing
  const compositeProjection = d3Geo.geoProjection((lambda, phi) => {
    // Convert radians to degrees for bounds checking
    const lon = (lambda * 180) / Math.PI
    const lat = (phi * 180) / Math.PI

    // Find which territory this point belongs to
    let selectedProj = null
    for (const { projection, bounds } of subProjections) {
      if (
        lon >= bounds[0][0] && lon <= bounds[1][0]
        && lat >= bounds[0][1] && lat <= bounds[1][1]
      ) {
        selectedProj = projection
        break
      }
    }

    // If no territory matched, use first projection (fallback)
    if (!selectedProj && subProjections[0]) {
      selectedProj = subProjections[0].projection
    }

    // Project the point (should always have a projection by this point)
    return selectedProj!([lambda, phi])
  })

  // Implement stream multiplexing for proper geometry routing
  const originalStream = compositeProjection.stream
  compositeProjection.stream = function (stream) {
    let activeStream: any = null
    let bufferedPoints: Array<[number, number]> = []

    return {
      point(lon: number, lat: number) {
        // Buffer points until we can determine which territory they belong to
        bufferedPoints.push([lon, lat])

        // If we have an active stream, forward the point
        if (activeStream) {
          const lonDeg = (lon * 180) / Math.PI
          const latDeg = (lat * 180) / Math.PI

          if (debug) {
            console.log(`[Stream] Point: [${lonDeg.toFixed(2)}, ${latDeg.toFixed(2)}] → ${activeStream.territoryCode}`)
          }

          activeStream.point(lon, lat)
        }
      },

      lineStart() {
        // Determine which territory this line belongs to
        if (bufferedPoints.length > 0 && bufferedPoints[0]) {
          const [lon, lat] = bufferedPoints[0]
          const lonDeg = (lon * 180) / Math.PI
          const latDeg = (lat * 180) / Math.PI

          // Find matching territory
          for (const { territory, projection, bounds } of subProjections) {
            if (
              lonDeg >= bounds[0][0] && lonDeg <= bounds[1][0]
              && latDeg >= bounds[0][1] && latDeg <= bounds[1][1]
            ) {
              activeStream = originalStream.call(projection, stream)
              activeStream.territoryCode = territory.code

              if (debug) {
                console.log(`[Stream] Line started in territory: ${territory.code}`)
              }
              break
            }
          }

          // Fallback to first projection
          if (!activeStream && subProjections[0]) {
            activeStream = originalStream.call(subProjections[0].projection, stream)
            activeStream.territoryCode = subProjections[0].territory.code

            if (debug) {
              console.log(`[Stream] Line started (fallback): ${activeStream.territoryCode}`)
            }
          }
        }

        if (activeStream) {
          activeStream.lineStart()

          // Replay buffered points
          for (const [lon, lat] of bufferedPoints) {
            activeStream.point(lon, lat)
          }
        }

        bufferedPoints = []
      },

      lineEnd() {
        if (activeStream) {
          activeStream.lineEnd()
        }
      },

      polygonStart() {
        bufferedPoints = []
        activeStream = null
      },

      polygonEnd() {
        if (activeStream) {
          activeStream.polygonEnd()
        }
        activeStream = null
      },

      sphere() {
        // Not supported in composite projections
        if (debug) {
          console.warn('[Stream] sphere() called - not supported in composite projections')
        }
      },
    }
  }

  // Set reasonable defaults for the composite projection
  // Note: Individual territories handle their own scale/translate
  compositeProjection
    .scale(1)
    .translate([width / 2, height / 2])

  return compositeProjection as GeoProjection
}

/**
 * Create a sub-projection for a single territory
 */
function createSubProjection(
  territory: Territory,
  width: number,
  height: number,
): any {
  const { projectionId, parameters, layout } = territory

  // Get projection factory
  const factory = PROJECTION_FACTORIES[projectionId]
  if (!factory) {
    throw new Error(`Unknown projection ID: ${projectionId}. Available: ${Object.keys(PROJECTION_FACTORIES).join(', ')}`)
  }

  // Create projection instance
  const projection = factory()

  // Apply parameters
  if (parameters.center && projection.center) {
    projection.center(parameters.center)
  }

  if (parameters.rotate && projection.rotate) {
    projection.rotate(parameters.rotate)
  }

  if (parameters.parallels && projection.parallels) {
    projection.parallels(parameters.parallels)
  }

  if (projection.scale) {
    projection.scale(parameters.scale)
  }

  // Apply layout translate
  if (projection.translate) {
    const [offsetX, offsetY] = layout.translateOffset
    projection.translate([
      width / 2 + offsetX,
      height / 2 + offsetY,
    ])
  }

  // Apply clipping if specified
  if (layout.clipExtent && projection.clipExtent) {
    projection.clipExtent(layout.clipExtent)
  }

  return projection
}

/**
 * Validate an exported configuration
 *
 * @param config - Configuration to validate
 * @returns True if valid, throws error otherwise
 */
export function validateConfig(config: any): config is ExportedConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object')
  }

  if (!config.version) {
    throw new Error('Configuration must have a version field')
  }

  if (!config.metadata || !config.metadata.atlasId) {
    throw new Error('Configuration must have metadata with atlasId')
  }

  if (!config.territories || !Array.isArray(config.territories)) {
    throw new Error('Configuration must have territories array')
  }

  if (config.territories.length === 0) {
    throw new Error('Configuration must have at least one territory')
  }

  // Validate each territory
  for (const territory of config.territories) {
    if (!territory.code || !territory.projectionId) {
      throw new Error(`Territory missing required fields: ${JSON.stringify(territory)}`)
    }

    if (!territory.parameters || !territory.bounds) {
      throw new Error(`Territory ${territory.code} missing parameters or bounds`)
    }
  }

  return true
}

/**
 * Load composite projection from JSON string
 *
 * @example
 * ```javascript
 * const jsonString = fs.readFileSync('france-composite.json', 'utf-8')
 * const projection = loadFromJSON(jsonString, { width: 800, height: 600 })
 * ```
 */
export function loadFromJSON(
  jsonString: string,
  options: LoaderOptions,
): GeoProjection {
  let config: any

  try {
    config = JSON.parse(jsonString)
  }
  catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  validateConfig(config)
  return loadCompositeProjection(config, options)
}

/**
 * Get list of supported projection IDs
 */
export function getSupportedProjections(): string[] {
  return Object.keys(PROJECTION_FACTORIES)
}

// Default export
export default {
  loadCompositeProjection,
  loadFromJSON,
  validateConfig,
  getSupportedProjections,
}
