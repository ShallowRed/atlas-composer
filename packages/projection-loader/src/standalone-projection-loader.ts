/**
 * Standalone Composite Projection Loader (Zero Dependencies)
 *
 * A pure JavaScript/TypeScript module that consumes exported composite projection
 * configurations and creates D3-compatible projections using a plugin architecture.
 *
 * This package uses @atlas-composer/projection-core for the shared composite
 * projection building logic. Users must register projection factories before
 * loading configurations.
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

import type { ProjectionLike as CoreProjectionLike, SubProjectionEntry } from '@atlas-composer/projection-core'
import type {
  CompositeProjectionConfig,
  GeoBounds,
  I18nString,
  LayoutConfig,
  ProjectionParameters as SpecProjectionParameters,
  TerritoryConfig,
} from '@atlas-composer/specification'

import {
  buildCompositeProjection,
  calculateClipExtentFromPixelOffset,
} from '@atlas-composer/projection-core'

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

// Re-export specification types for convenience
export type { CompositeProjectionConfig, GeoBounds, I18nString, LayoutConfig, TerritoryConfig }

/**
 * Resolve an I18nString to a plain string.
 * For i18n objects, returns the English value or the first available translation.
 */
function resolveI18nString(value: I18nString): string {
  if (typeof value === 'string') {
    return value
  }
  // Return English first, or the first available language
  return value.en || Object.values(value).find(v => typeof v === 'string') || ''
}

/**
 * Projection parameters with loader-specific extensions.
 * @deprecated Specification now includes all legacy parameters
 */
export type ProjectionParameters = SpecProjectionParameters

/**
 * Exported configuration format.
 * Alias for CompositeProjectionConfig for backward compatibility.
 * @deprecated Use CompositeProjectionConfig from @atlas-composer/specification
 */
export type ExportedConfig = CompositeProjectionConfig

/**
 * Territory configuration.
 * Alias for TerritoryConfig for backward compatibility.
 * @deprecated Use TerritoryConfig from @atlas-composer/specification
 */
export type Territory = TerritoryConfig

/**
 * Layout configuration.
 * Alias for LayoutConfig for backward compatibility.
 * @deprecated Use LayoutConfig from @atlas-composer/specification
 */
export type Layout = LayoutConfig

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

  // Create sub-projections for each territory and convert to SubProjectionEntry format
  const entries: SubProjectionEntry[] = config.territories.map((territory) => {
    const proj = createSubProjection(territory, width, height, config.referenceScale, debug)

    return {
      id: territory.code,
      name: resolveI18nString(territory.name),
      projection: proj as CoreProjectionLike,
      bounds: {
        minLon: territory.bounds[0][0],
        minLat: territory.bounds[0][1],
        maxLon: territory.bounds[1][0],
        maxLat: territory.bounds[1][1],
      },
    }
  })

  if (debug) {
    console.log('[CompositeProjection] Created sub-projections:', {
      territories: config.territories.map(t => ({ code: t.code, name: resolveI18nString(t.name) })),
      count: entries.length,
    })
  }

  // Use projection-core to build the composite projection
  const composite = buildCompositeProjection({ entries, debug })

  return composite as ProjectionLike
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
  // Extract projection info and parameters from nested projection object
  const { layout } = territory
  const projectionId = territory.projection.id
  const parameters = territory.projection.parameters

  if (!projectionId || !parameters) {
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

  // Convert legacy focusLongitude/focusLatitude to center/rotate
  const hasFocus = parameters.focusLongitude !== undefined && parameters.focusLatitude !== undefined
  const projFamily = territory.projection.family

  // Apply parameters based on projection family
  if (hasFocus && projFamily === 'CONIC' && projection.rotate) {
    // Conic projections use rotate: [-focusLon, -focusLat, 0]
    projection.rotate([-parameters.focusLongitude!, -parameters.focusLatitude!, 0])
  }
  else if (hasFocus && projection.center) {
    // Other projections use center: [focusLon, focusLat]
    projection.center([parameters.focusLongitude!, parameters.focusLatitude!])
  }
  else if (parameters.center && projection.center) {
    // Standard center format
    projection.center(parameters.center)
  }

  if (parameters.rotate && projection.rotate && !hasFocus) {
    // Only apply rotate if not already set by focusLongitude/focusLatitude
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

  // Handle scale using scaleMultiplier and referenceScale
  if (projection.scale && parameters.scaleMultiplier) {
    const effectiveReferenceScale = referenceScale || 2700 // Default reference scale
    const calculatedScale = effectiveReferenceScale * parameters.scaleMultiplier
    projection.scale(calculatedScale)
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

  // Apply clipping - this is CRITICAL for composite projections
  // Each sub-projection MUST have clipping to avoid geometry processing conflicts
  if (layout.pixelClipExtent && projection.clipExtent) {
    // Get territory center from translate
    const territoryCenter = projection.translate?.() || [width / 2, height / 2]

    // Use core utility for clip extent calculation
    const clipExtent = calculateClipExtentFromPixelOffset(
      territoryCenter,
      layout.pixelClipExtent,
    )

    projection.clipExtent(clipExtent)
    if (debug) {
      console.log(
        `[Clipping] Applied pixelClipExtent for ${territory.code}:`,
        `original: ${JSON.stringify(layout.pixelClipExtent)} -> transformed: ${JSON.stringify(clipExtent)}`,
      )
    }
  }
  else if (projection.clipExtent) {
    // If no clip extent is specified, create a default one based on territory bounds
    const bounds = territory.bounds
    if (bounds && bounds.length === 2 && bounds[0].length === 2 && bounds[1].length === 2) {
      // Convert geographic bounds to pixel bounds (approximate)
      const scale = projection.scale?.() || 1
      const translate = projection.translate?.() || [0, 0]

      // Create a reasonable clip extent based on the geographic bounds
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

    // Check for required nested projection format
    if (!territory.projection || !territory.projection.id || !territory.projection.parameters) {
      throw new Error(`Territory ${territory.code} missing projection configuration. Required: projection.id and projection.parameters`)
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
