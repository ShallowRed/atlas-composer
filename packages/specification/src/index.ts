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

export {
  findTerritory,
  getTerritoryCodes,
  isCompositeProjectionConfig,
  MIN_SUPPORTED_VERSION,
  SPECIFICATION_VERSION,
} from './types.js'

export {
  validateConfig,
  validateVersion,
  type ValidationError,
  type ValidationResult,
} from './validation.js'
