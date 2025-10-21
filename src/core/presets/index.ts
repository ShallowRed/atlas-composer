/**
 * Preset Core Module
 *
 * Core domain logic for the preset system.
 * Exports types, validators, and converters for all preset types.
 */

// Converters
export { convertToDefaults, extractTerritoryParameters } from './converter'

// Types (Unified)
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
