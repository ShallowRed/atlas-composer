export { PROJECTION_CATALOG, resolveProjectionAlias } from './catalog.js'

export {
  DEFAULT_SCALE_MULTIPLIER,
  PROJECTION_FAMILIES,
  PROJECTION_PARAMETER_KEYS,
} from './generated/constants.js'

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
  DEFAULT_REFERENCE_SCALE,
  findTerritory,
  getTerritoryCodes,
  SPECIFICATION_VERSION,
} from './types.js'

export {
  isCompositeProjectionConfig,
  validateConfig,
  validateVersion,
  type ValidationError,
  type ValidationResult,
} from './validation.js'
