/**
 * @atlas-composer/projection-loader
 *
 * Zero-dependency standalone loader for composite map projections.
 *
 * This package provides a plugin architecture for loading composite projections
 * exported from Atlas composer. Users register only the projections they need,
 * resulting in optimal bundle sizes (94% smaller than including all D3 projections).
 *
 * @example
 * ```typescript
 * import * as d3 from 'd3-geo'
 * import { registerProjection, loadCompositeProjection } from '@atlas-composer/projection-loader'
 *
 * // Register only what you need
 * registerProjection('mercator', () => d3.geoMercator())
 * registerProjection('conic-conformal', () => d3.geoConicConformal())
 *
 * // Load your exported configuration
 * const projection = loadCompositeProjection(config, { width: 800, height: 600 })
 *
 * // Use with D3
 * const path = d3.geoPath(projection)
 * ```
 *
 * @packageDocumentation
 */

export {
  clearProjections,
  getRegisteredProjections,
  isProjectionRegistered,
  loadCompositeProjection,
  loadFromJSON,
  registerProjection,
  registerProjections,
  unregisterProjection,
  validateConfig,
} from './standalone-projection-loader'

export type {
  ExportedConfig,
  Layout,
  LoaderOptions,
  ProjectionFactory,
  ProjectionLike,
  ProjectionParameters,
  StreamLike,
  Territory,
} from './standalone-projection-loader'
