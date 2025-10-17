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
  clipAngle?: {
    (): number
    (angle: number): ProjectionLike
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
    exportDate?: string
    createdWith?: string
    notes?: string
  }
  pattern: string
  referenceScale?: number
  canvasDimensions?: {
    width: number
    height: number
  }
  territories: Territory[]
}

export interface Territory {
  code: string
  name: string
  role: string
  // Support multiple formats
  projectionId?: string // Legacy format
  projectionFamily?: string // Migration script format
  projection?: {
    id: string
    family: string
    parameters: ProjectionParameters
  } // New format
  parameters?: ProjectionParameters // Used in legacy and migration formats
  layout: Layout
  bounds: [[number, number], [number, number]]
}

export interface ProjectionParameters {
  center?: [number, number]
  rotate?: [number, number, number]
  // Legacy format support
  scale?: number
  baseScale?: number
  scaleMultiplier?: number
  parallels?: [number, number]
  // Additional parameters from new format
  translate?: [number, number]
  clipAngle?: number
  precision?: number
}

export interface Layout {
  translateOffset?: [number, number] // Make optional for migration script format
  clipExtent?: [[number, number], [number, number]] | null
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
    const proj = createSubProjection(territory, width, height, config.referenceScale, debug)

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

  // Point capture mechanism (like Atlas Composer's CompositeProjection)
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
  const subProjPoints = subProjections.map(subProj => ({
    subProj: {
      territoryCode: subProj.territory.code,
      territoryName: subProj.territory.name,
      bounds: subProj.bounds,
      projection: subProj.projection,
    },
    stream: subProj.projection.stream(pointStream),
  }))

  // Main projection function (like Atlas Composer's CompositeProjection)
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

  // Multiplex stream (like Atlas Composer's CompositeProjection)
  ;(compositeProjection as any).stream = (stream: any) => {
    const streams = subProjections.map(sp => sp.projection.stream(stream))
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

  // Add invert method (like Atlas Composer's CompositeProjection)
  ;(compositeProjection as any).invert = (coordinates: [number, number]) => {
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return null
    }

    const [x, y] = coordinates

    // Try each sub-projection's invert
    for (const { projection } of subProjections) {
      if ((projection as any).invert) {
        try {
          const result = (projection as any).invert([x, y])
          if (result && Array.isArray(result) && result.length >= 2) {
            return result as [number, number]
          }
        }
        catch (error) {
          // Continue to next projection
          if (debug) {
            console.warn('[Invert] Error in sub-projection invert:', error)
          }
        }
      }
    }

    return null
  }

  // Add scale and translate methods (like Atlas Composer's CompositeProjection)
  ;(compositeProjection as any).scale = function (_s?: number): any {
    if (arguments.length === 0) {
      // Return scale from first sub-projection as reference
      return subProjections[0] ? subProjections[0].projection.scale?.() || 1 : 1
    }
    // Setting scale - not typically used for composite projections
    // Individual territories manage their own scales
    return compositeProjection
  }

  ;(compositeProjection as any).translate = function (_t?: [number, number]): any {
    if (arguments.length === 0) {
      // Return center point as reference
      return [width / 2, height / 2]
    }
    // Setting translate - not typically used for composite projections
    // Individual territories manage their own translations
    return compositeProjection
  }

  return compositeProjection as ProjectionLike
}

/**
 * Infer projection ID from family and parameters (for migration script format)
 */
function inferProjectionIdFromFamily(family: string, parameters: ProjectionParameters): string {
  // Common projection mappings based on family and parameters
  switch (family.toUpperCase()) {
    case 'CYLINDRICAL':
      return 'mercator' // Most common cylindrical projection
    case 'CONIC':
      return parameters.parallels ? 'conic-conformal' : 'conic-equal-area'
    case 'AZIMUTHAL':
      return 'azimuthal-equal-area'
    default:
      // Fallback to mercator if we can't determine
      console.warn(`Unknown projection family: ${family}, falling back to mercator`)
      return 'mercator'
  }
}

/**
 * Create a sub-projection for a single territory
 */
function createSubProjection(
  territory: Territory,
  width: number,
  height: number,
  referenceScale?: number,
  debug?: boolean,
): ProjectionLike {
  // Extract projection info and parameters from multiple formats
  let projectionId: string
  let parameters: ProjectionParameters
  const { layout } = territory

  if (territory.projection) {
    // New format: nested projection object
    projectionId = territory.projection.id
    parameters = territory.projection.parameters
  }
  else if (territory.projectionId && territory.parameters) {
    // Legacy format: direct properties
    projectionId = territory.projectionId
    parameters = territory.parameters
  }
  else if (territory.projectionFamily && territory.parameters) {
    // Migration script format: has projectionFamily but missing projectionId
    // Try to infer projection ID from family and parameters
    projectionId = inferProjectionIdFromFamily(territory.projectionFamily as string, territory.parameters)
    parameters = territory.parameters
  }
  else {
    throw new Error(`Territory ${territory.code} missing projection configuration`)
  }

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
    // Ensure rotate has exactly 3 elements
    const rotate = Array.isArray(parameters.rotate)
      ? [...parameters.rotate, 0, 0].slice(0, 3) as [number, number, number]
      : [0, 0, 0] as [number, number, number]
    projection.rotate(rotate)
  }

  if (parameters.parallels && projection.parallels) {
    // Ensure parallels has exactly 2 elements
    const parallels = Array.isArray(parameters.parallels)
      ? [...parameters.parallels, 0].slice(0, 2) as [number, number]
      : [0, 60] as [number, number]
    projection.parallels(parallels)
  }

  // Handle scale - support both legacy (scale) and new (scaleMultiplier + referenceScale) formats
  if (projection.scale) {
    if (parameters.scale) {
      // Legacy format: use direct scale value
      projection.scale(parameters.scale)
    }
    else if (parameters.scaleMultiplier) {
      // New format: calculate scale from reference scale and multiplier
      const effectiveReferenceScale = referenceScale || 2700 // Default reference scale
      const calculatedScale = effectiveReferenceScale * parameters.scaleMultiplier
      projection.scale(calculatedScale)
    }
  }

  // Apply additional parameters
  if (parameters.clipAngle && projection.clipAngle) {
    projection.clipAngle(parameters.clipAngle)
  }

  if (parameters.precision && projection.precision) {
    projection.precision(parameters.precision)
  }

  // Apply layout translate
  if (projection.translate) {
    const [offsetX, offsetY] = layout.translateOffset || [0, 0] // Default to center if missing
    projection.translate([
      width / 2 + offsetX,
      height / 2 + offsetY,
    ])
  }

  // Apply parameter-level translate (additional adjustment)
  if (parameters.translate && projection.translate) {
    const currentTranslate = projection.translate()
    const [additionalX, additionalY] = parameters.translate
    projection.translate([
      currentTranslate[0] + additionalX,
      currentTranslate[1] + additionalY,
    ])
  }

  // Apply clipping - this is CRITICAL for composite projections
  // Each sub-projection MUST have clipping to avoid geometry processing conflicts
  if (layout.clipExtent && projection.clipExtent) {
    // Like Atlas Composer: clipExtent is relative to the main projection coordinate system
    // Get the reference scale (use same as Atlas Composer does)
    const effectiveReferenceScale = referenceScale || 2700
    const centerX = width / 2
    const centerY = height / 2

    // Apply Atlas Composer's approach: clipExtent values are multiplied by reference scale
    // and positioned relative to map center, with small epsilon for padding
    const [[x1, y1], [x2, y2]] = layout.clipExtent
    const epsilon = 1e-6 // Small value for padding, matching d3-composite-projections

    const transformedClipExtent: [[number, number], [number, number]] = [
      [centerX + x1 * effectiveReferenceScale + epsilon, centerY + y1 * effectiveReferenceScale + epsilon],
      [centerX + x2 * effectiveReferenceScale - epsilon, centerY + y2 * effectiveReferenceScale - epsilon],
    ]

    projection.clipExtent(transformedClipExtent)
    if (debug) {
      console.log(`[Clipping] Applied Atlas Composer-style clip extent for ${territory.code}:`, `original: ${JSON.stringify(layout.clipExtent)} -> transformed: ${JSON.stringify(transformedClipExtent)}`)
    }
  }
  else if (projection.clipExtent) {
    // If no clip extent is specified, create a default one based on territory bounds
    // This prevents the projection from processing geometry outside its area
    const bounds = territory.bounds
    if (bounds && bounds.length === 2 && bounds[0].length === 2 && bounds[1].length === 2) {
      // Convert geographic bounds to pixel bounds (approximate)
      const scale = projection.scale?.() || 1
      const translate = projection.translate?.() || [0, 0]

      // Create a reasonable clip extent based on the geographic bounds
      // This is a simplified approach - in practice, you'd want more precise clipping
      const padding = scale * 0.1 // 10% padding
      const clipExtent: [[number, number], [number, number]] = [
        [translate[0] - padding, translate[1] - padding],
        [translate[0] + padding, translate[1] + padding],
      ]

      projection.clipExtent(clipExtent)

      if (debug) {
        console.log(`[Clipping] Applied default clip extent for ${territory.code}:`, clipExtent)
      }
    }
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
    if (!territory.code) {
      throw new Error(`Territory missing required field 'code': ${JSON.stringify(territory)}`)
    }

    // Check for projection info in either format
    const hasLegacyFormat = territory.projectionId && territory.parameters
    const hasNewFormat = territory.projection && territory.projection.id && territory.projection.parameters
    const hasIncompleteFormat = territory.projectionFamily && territory.parameters // Migration script format

    if (!hasLegacyFormat && !hasNewFormat && !hasIncompleteFormat) {
      throw new Error(`Territory ${territory.code} missing projection configuration. Available fields: ${Object.keys(territory).join(', ')}`)
    }

    if (!territory.bounds) {
      throw new Error(`Territory ${territory.code} missing bounds`)
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
