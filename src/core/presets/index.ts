export { convertToDefaults, extractTerritoryParameters } from './converter'

export type {
  AtlasProjectionMetadata,
  BasePresetMetadata,
  CompositeCustomConfig,
  CompositeExistingPreset,
  CompositeExistingViewConfig,
  CompositePreset,
  LoadResult,
  Preset,
  PresetType,
  SplitPreset,
  SplitViewConfig,
  TerritoryDefaults,
  UnifiedPreset,
  UnifiedViewConfig,
  ViewPresetMode,
} from './types'

// Validation utilities
export type { ValidationResult } from './validation-utils'
export {
  combineValidationResults,
  SUPPORTED_VERSIONS,
  validateAtlasId,
  validateMetadata,
  validateProjectionId,
  validateProjectionParameters,
  validateVersion,
} from './validation-utils'

// Validators
export type { ViewPresetValidationResult } from './validator'
export { validateCompositePreset, validatePreset, validateViewPreset } from './validator'
