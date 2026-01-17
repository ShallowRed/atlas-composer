/**
 * @atlas-composer/specification
 *
 * JSON Schema specification and TypeScript types for Atlas Composer
 * composite map projection configurations.
 *
 * @packageDocumentation
 */

// Core types
export type {
  AtlasMetadata,
  CanvasDimensions,
  CompositeProjectionConfig,
  ConfigMetadata,
  GeoBounds,
  I18nString,
  LayoutConfig,
  ProjectionFamily,
  ProjectionParameters,
  TerritoryConfig,
} from './types.js'

// Type guards and utilities
export {
  findTerritory,
  getTerritoryCodes,
  isCompositeProjectionConfig,
  MIN_SUPPORTED_VERSION,
  SPECIFICATION_VERSION,
} from './types.js'

// Validation utilities
export {
  validateConfig,
  validateVersion,
  type ValidationError,
  type ValidationResult,
} from './validation.js'
