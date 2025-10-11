/**
 * Standalone Composite Projection Loader (Zero Dependencies)
 *
 * A pure JavaScript/TypeScript module that consumes exported composite projection
 * configurations and creates D3-compatible projections using a plugin architecture.
 *
 * This package has ZERO dependencies. Users must register projection factories
 * before loading configurations.
 *
 * @example
 * ```typescript
 * // Register projections first
 * import * as d3 from 'd3-geo'
 * import { registerProjection, loadCompositeProjection } from './standalone-projection-loader'
 *
 * registerProjection('mercator', () => d3.geoMercator())
 * registerProjection('albers', () => d3.geoAlbers())
 *
 * // Then load your configuration
 * const projection = loadCompositeProjection(config, { width: 800, height: 600 })
 * ```
 *
 * @packageDocumentation
 */

/**
 * Generic projection-like interface that matches D3 projections
 * without requiring d3-geo as a dependency
 *
 * Note: D3 projections use getter/setter pattern where calling without
 * arguments returns the current value, and with arguments sets and returns this.
 */
export interface ProjectionLike {
  (coordinates: [number, number]): [number, number] | null
  center?: {
    (): [number, number]
    (center: [number, number]): ProjectionLike
  }
  rotate?: {
    (): [number, number, number]
    (angles: [number, number, number]): ProjectionLike
  }
  parallels?: {
    (): [number, number]
    (parallels: [number, number]): ProjectionLike
  }
  scale?: {
    (): number
    (scale: number): ProjectionLike
  }
  translate?: {
    (): [number, number]
    (translate: [number, number]): ProjectionLike
  }
  clipExtent?: {
    (): [[number, number], [number, number]] | null
    (extent: [[number, number], [number, number]] | null): ProjectionLike
  }
  stream?: (stream: StreamLike) => StreamLike
  precision?: {
    (): number
    (precision: number): ProjectionLike
  }
  fitExtent?: (extent: [[number, number], [number, number]], object: any) => ProjectionLike
  fitSize?: (size: [number, number], object: any) => ProjectionLike
  fitWidth?: (width: number, object: any) => ProjectionLike
  fitHeight?: (height: number, object: any) => ProjectionLike
}

/**
 * Stream protocol interface for D3 geographic transforms
 */
export interface StreamLike {
  point: (x: number, y: number) => void
  lineStart: () => void
  lineEnd: () => void
  polygonStart: () => void
  polygonEnd: () => void
  sphere?: () => void
}

/**
 * Factory function that creates a projection instance
 */
export type ProjectionFactory = () => ProjectionLike

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
 * Runtime registry for projection factories
 * Users must register projections before loading configurations
 */
const projectionRegistry = new Map<string, ProjectionFactory>()

/**
 * Register a projection factory with a given ID
 *
 * @example
 * ```typescript
 * import * as d3 from 'd3-geo'
 * import { registerProjection } from '@atlas-composer/projection-loader'
 *
 * registerProjection('mercator', () => d3.geoMercator())
 * registerProjection('albers', () => d3.geoAlbers())
 * ```
 *
 * @param id - Projection identifier (e.g., 'mercator', 'albers')
 * @param factory - Function that creates a new projection instance
 */
export function registerProjection(id: string, factory: ProjectionFactory): void {
  projectionRegistry.set(id, factory)
}

/**
 * Register multiple projections at once
 *
 * @example
 * ```typescript
 * import * as d3 from 'd3-geo'
 * import { registerProjections } from '@atlas-composer/projection-loader'
 *
 * registerProjections({
 *   'mercator': () => d3.geoMercator(),
 *   'albers': () => d3.geoAlbers(),
 *   'conic-equal-area': () => d3.geoConicEqualArea()
 * })
 * ```
 *
 * @param factories - Object mapping projection IDs to factory functions
 */
export function registerProjections(factories: Record<string, ProjectionFactory>): void {
  for (const [id, factory] of Object.entries(factories)) {
    registerProjection(id, factory)
  }
}

/**
 * Unregister a projection
 *
 * @param id - Projection identifier to remove
 * @returns True if the projection was removed, false if it wasn't registered
 */
export function unregisterProjection(id: string): boolean {
  return projectionRegistry.delete(id)
}

/**
 * Clear all registered projections
 */
export function clearProjections(): void {
  projectionRegistry.clear()
}

/**
 * Get list of currently registered projection IDs
 *
 * @returns Array of registered projection identifiers
 */
export function getRegisteredProjections(): string[] {
  return Array.from(projectionRegistry.keys())
}

/**
 * Check if a projection is registered
 *
 * @param id - Projection identifier to check
 * @returns True if the projection is registered
 */
export function isProjectionRegistered(id: string): boolean {
  return projectionRegistry.has(id)
}

/**
 * Create a minimal projection wrapper (similar to d3.geoProjection)
 * This allows us to avoid the d3-geo dependency
 */
function createProjectionWrapper(
  project: (lambda: number, phi: number) => [number, number] | null,
): ProjectionLike {
  let _scale = 150
  let _translate: [number, number] = [480, 250]

  const projection = function (coordinates: [number, number]): [number, number] | null {
    const point = project(coordinates[0] * Math.PI / 180, coordinates[1] * Math.PI / 180)
    if (!point)
      return null
    return [point[0] * _scale + _translate[0], point[1] * _scale + _translate[1]]
  } as ProjectionLike

  // D3-style getter/setter for scale
  projection.scale = ((s?: number): any => {
    if (arguments.length === 0)
      return _scale
    _scale = s!
    return projection
  }) as any

  // D3-style getter/setter for translate
  projection.translate = ((t?: [number, number]): any => {
    if (arguments.length === 0)
      return _translate
    _translate = t!
    return projection
  }) as any

  return projection
}

/**
 * Create a D3-compatible projection from an exported composite projection configuration
 *
 * @example
 * ```typescript
 * import * as d3 from 'd3-geo'
 * import { registerProjection, loadCompositeProjection } from '@atlas-composer/projection-loader'
 *
 * // Register projections first
 * registerProjection('mercator', () => d3.geoMercator())
 * registerProjection('albers', () => d3.geoAlbers())
 *
 * // Load configuration
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
 * @returns D3-compatible projection that routes geometry to appropriate sub-projections
 */
export function loadCompositeProjection(
  config: ExportedConfig,
  options: LoaderOptions,
): ProjectionLike {
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

  // Create composite projection using custom stream multiplexing
  const compositeProjection = createProjectionWrapper((lambda: number, phi: number) => {
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
  compositeProjection.stream = function (stream: StreamLike): StreamLike {
    let activeStream: StreamLike | null = null
    let bufferedPoints: Array<[number, number]> = []
    let activeTerritoryCode = ''

    return {
      point(lon: number, lat: number) {
        // Buffer points until we can determine which territory they belong to
        bufferedPoints.push([lon, lat])

        // If we have an active stream, forward the point
        if (activeStream) {
          const lonDeg = (lon * 180) / Math.PI
          const latDeg = (lat * 180) / Math.PI

          if (debug) {
            console.log(`[Stream] Point: [${lonDeg.toFixed(2)}, ${latDeg.toFixed(2)}] → ${activeTerritoryCode}`)
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
              // Use the projection's stream if available
              if (projection.stream) {
                activeStream = projection.stream(stream)
                activeTerritoryCode = territory.code
              }

              if (debug) {
                console.log(`[Stream] Line started in territory: ${territory.code}`)
              }
              break
            }
          }

          // Fallback to first projection
          if (!activeStream && subProjections[0]) {
            const firstProj = subProjections[0].projection
            if (firstProj.stream) {
              activeStream = firstProj.stream(stream)
              activeTerritoryCode = subProjections[0].territory.code
            }

            if (debug) {
              console.log(`[Stream] Line started (fallback): ${activeTerritoryCode}`)
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
  if (compositeProjection.scale) {
    compositeProjection.scale(1)
  }
  if (compositeProjection.translate) {
    compositeProjection.translate([width / 2, height / 2])
  }

  return compositeProjection
}

/**
 * Create a sub-projection for a single territory
 */
function createSubProjection(
  territory: Territory,
  width: number,
  height: number,
): ProjectionLike {
  const { projectionId, parameters, layout } = territory

  // Get projection factory from registry
  const factory = projectionRegistry.get(projectionId)
  if (!factory) {
    const registered = getRegisteredProjections()
    const availableList = registered.length > 0 ? registered.join(', ') : 'none'
    throw new Error(
      `Projection "${projectionId}" is not registered. `
      + `Available projections: ${availableList}. `
      + `Use registerProjection('${projectionId}', factory) to register it.`,
    )
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
 * ```typescript
 * import * as d3 from 'd3-geo'
 * import { registerProjection, loadFromJSON } from '@atlas-composer/projection-loader'
 *
 * // Register projections first
 * registerProjection('mercator', () => d3.geoMercator())
 *
 * // Load from JSON
 * const jsonString = fs.readFileSync('france-composite.json', 'utf-8')
 * const projection = loadFromJSON(jsonString, { width: 800, height: 600 })
 * ```
 */
export function loadFromJSON(
  jsonString: string,
  options: LoaderOptions,
): ProjectionLike {
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

// Default export
export default {
  // Core loading functions
  loadCompositeProjection,
  loadFromJSON,
  validateConfig,

  // Registry management
  registerProjection,
  registerProjections,
  unregisterProjection,
  clearProjections,
  getRegisteredProjections,
  isProjectionRegistered,
}
