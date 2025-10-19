/**
 * Preset Core Module
 *
 * Core domain logic for the preset system.
 * Exports types, validators, and converters for both
 * composite-custom and view mode presets.
 */

// Converters
export { convertToDefaults, extractTerritoryParameters } from './converter'

// Types
export type {
  AtlasProjectionMetadata,
  CompositeExistingViewConfig,
  ExtendedPresetConfig,
  PresetLoadResult,
  SplitViewConfig,
  TerritoryDefaults,
  UnifiedViewConfig,
  ViewModePreset,
  ViewPresetLoadResult,
  ViewPresetMode,
  ViewPresetRegistry,
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
export { validateCompositePreset, validateViewPreset } from './validator'
