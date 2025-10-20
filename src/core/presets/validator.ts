/**
 * Preset Validator
 *
 * Core validation logic for preset configurations.
 * Unified validation for all preset types (composite-custom, unified, split, built-in-composite).
 */

import type {
  CompositeCustomConfig,
  CompositeExistingViewConfig,
  LoadResult,
  PresetType,
  SplitViewConfig,
  UnifiedViewConfig,
  ViewPresetMode,
} from './types'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { ImportResult } from '@/services/export/composite-import-service'

import { parameterRegistry } from '@/core/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { CompositeImportService } from '@/services/export/composite-import-service'
import {
  validateAtlasId,
  validateProjectionId,
  validateProjectionParameters,
} from './validation-utils'

/**
 * Validation result for view presets
 */
export interface ViewPresetValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Unified preset validation function (strategy pattern)
 * Routes to appropriate validator based on preset type
 *
 * @param preset - Any preset configuration object
 * @param presetType - The type of preset to validate
 * @param jsonText - Original JSON text (required for composite-custom validation)
 * @returns Validation result
 */
export function validatePreset(
  preset: any,
  presetType: PresetType,
  jsonText?: string,
): ViewPresetValidationResult {
  switch (presetType) {
    case 'composite-custom': {
      if (!jsonText) {
        return {
          isValid: false,
          errors: ['jsonText is required for composite-custom preset validation'],
          warnings: [],
        }
      }
      const result = validateCompositePreset(jsonText, preset as CompositeCustomConfig)
      return {
        isValid: result.success,
        errors: result.errors,
        warnings: result.warnings,
      }
    }
    case 'unified':
    case 'split':
    case 'built-in-composite': {
      // Inline validation for view mode presets
      const viewPreset = {
        id: preset.id || 'unknown',
        name: preset.name || 'Unknown',
        description: preset.description,
        atlasId: preset.atlasId || 'unknown',
        viewMode: presetType as ViewPresetMode,
        config: preset.config || preset,
      }
      return validateViewPreset(viewPreset)
    }
    default: {
      return {
        isValid: false,
        errors: [`Unknown preset type: ${presetType}`],
        warnings: [],
      }
    }
  }
}

/**
 * Validate a composite preset configuration
 * Checks structure using CompositeImportService and validates parameters
 *
 * @param jsonText - JSON string to validate
 * @param rawPreset - Parsed preset object (for metadata)
 * @returns Validation result with validated preset or errors
 */
export function validateCompositePreset(
  jsonText: string,
  rawPreset: CompositeCustomConfig,
): LoadResult<CompositeCustomConfig> {
  // Validate structure using CompositeImportService
  const importResult: ImportResult = CompositeImportService.importFromJSON(jsonText)

  if (!importResult.success) {
    return {
      success: false,
      errors: importResult.errors,
      warnings: importResult.warnings,
    }
  }

  // Additional validation using parameter registry
  const paramErrors: string[] = []
  const paramWarnings: string[] = []

  for (const territory of rawPreset.territories) {
    const family = territory.projection.family as ProjectionFamilyType

    // Check required parameters - these are hard errors
    // Only check parameters that are relevant for this projection family
    const required = parameterRegistry.getRequired()
    for (const def of required) {
      // Check if parameter is relevant for this projection family
      const constraints = parameterRegistry.getConstraintsForFamily(def.key as string, family)
      const isRelevant = constraints.relevant

      if (def.requiresPreset && isRelevant) {
        // Check if parameter exists in the appropriate location
        let hasParameter = false

        if (def.key === 'projectionId') {
          // projectionId is stored at projection.id (not in parameters)
          hasParameter = territory.projection?.id !== undefined
        }
        else if (def.key === 'translateOffset') {
          // translateOffset is stored in layout section
          hasParameter = territory.layout?.translateOffset !== undefined
        }
        else if (def.key === 'pixelClipExtent') {
          // pixelClipExtent is stored in layout section (optional)
          hasParameter = territory.layout?.pixelClipExtent !== undefined
        }
        else {
          // Other parameters are stored in projection.parameters section
          hasParameter = def.key in territory.projection.parameters
        }

        if (!hasParameter) {
          paramErrors.push(`Territory ${territory.code}: missing required parameter ${def.key}`)
        }
      }
    }

    // Validate parameter values - these are warnings, not hard errors
    const validationResults = parameterRegistry.validateParameters(
      territory.projection.parameters,
      family,
    )
    for (const result of validationResults) {
      if (!result.isValid) {
        paramWarnings.push(`Territory ${territory.code}: ${result.error}`)
      }
    }
  }

  // Only fail on structural/required parameter errors, not validation warnings
  if (paramErrors.length > 0) {
    return {
      success: false,
      errors: [...importResult.errors, ...paramErrors],
      warnings: [...importResult.warnings, ...paramWarnings],
    }
  }

  // Combine validated preset with atlas metadata
  const extendedPreset: CompositeCustomConfig = {
    ...importResult.config!,
    atlasMetadata: rawPreset.atlasMetadata,
  }

  // Return validated preset with parameter validation warnings
  return {
    success: true,
    data: extendedPreset,
    errors: [],
    warnings: [...importResult.warnings, ...paramWarnings],
  }
}

/**
 * Validate a view mode preset
 * Checks structure, required fields, and view mode-specific configuration
 *
 * @param preset - View preset to validate
 * @returns Validation result with errors and warnings
 */
export function validateViewPreset(preset: {
  id: string
  name: string
  description?: string
  atlasId: string
  viewMode: ViewPresetMode
  config: UnifiedViewConfig | SplitViewConfig | CompositeExistingViewConfig
}): ViewPresetValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate required fields
  if (!preset.id) {
    errors.push('Missing required field: id')
  }
  if (!preset.name) {
    errors.push('Missing required field: name')
  }
  if (!preset.config) {
    errors.push('Missing required field: config')
  }

  // Validate atlasId using shared utility
  if (preset.atlasId) {
    const atlasValidation = validateAtlasId(preset.atlasId, { allowUnknown: true })
    errors.push(...atlasValidation.errors)
    warnings.push(...atlasValidation.warnings)
  }
  else {
    errors.push('Missing required field: atlasId')
  }

  // Validate view mode
  const validViewModes: ViewPresetMode[] = ['unified', 'split', 'built-in-composite']
  if (preset.viewMode && !validViewModes.includes(preset.viewMode)) {
    errors.push(`Invalid view mode: ${preset.viewMode}. Must be one of: ${validViewModes.join(', ')}`)
  }
  else if (!preset.viewMode) {
    errors.push('Missing required field: viewMode')
  }

  // Validate view mode-specific configuration
  if (preset.viewMode === 'unified') {
    validateUnifiedConfig(preset.config as UnifiedViewConfig, errors, warnings)
  }
  else if (preset.viewMode === 'split') {
    validateSplitConfig(preset.config as SplitViewConfig, errors, warnings)
  }
  else if (preset.viewMode === 'built-in-composite') {
    validateCompositeExistingConfig(preset.config as CompositeExistingViewConfig, errors, warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate unified view configuration
 * Checks projection exists and validates parameters
 */
function validateUnifiedConfig(
  config: UnifiedViewConfig,
  errors: string[],
  warnings: string[],
): void {
  if (!config.projection) {
    errors.push('Unified config missing projection')
    return
  }

  // Validate projection ID using shared utility
  const projIdValidation = validateProjectionId(config.projection.id)
  errors.push(...projIdValidation.errors)
  warnings.push(...projIdValidation.warnings)

  if (projIdValidation.isValid) {
    // Validate projection exists in registry
    const projection = projectionRegistry.get(config.projection.id)
    if (!projection) {
      errors.push(`Unknown projection: ${config.projection.id}`)
      return
    }

    // Validate parameters using shared utility
    if (config.projection.parameters) {
      const paramValidation = validateProjectionParameters(
        config.projection.parameters,
        projection.family,
        { context: 'unified projection' },
      )
      errors.push(...paramValidation.errors)
      warnings.push(...paramValidation.warnings)
    }
  }
}

/**
 * Validate split view configuration
 * Checks mainland and territory projections
 */
function validateSplitConfig(
  config: SplitViewConfig,
  errors: string[],
  warnings: string[],
): void {
  // Validate mainland
  if (!config.mainland) {
    errors.push('Split config missing mainland')
    return
  }

  // Validate mainland projection ID using shared utility
  const mainlandIdValidation = validateProjectionId(config.mainland.projection?.id)
  if (!mainlandIdValidation.isValid) {
    errors.push(...mainlandIdValidation.errors.map(e => `Mainland: ${e}`))
    return
  }

  // Validate mainland projection
  const mainlandProjection = projectionRegistry.get(config.mainland.projection.id)
  if (!mainlandProjection) {
    errors.push(`Unknown mainland projection: ${config.mainland.projection.id}`)
  }
  else if (config.mainland.projection.parameters) {
    const paramValidation = validateProjectionParameters(
      config.mainland.projection.parameters,
      mainlandProjection.family,
      { context: 'mainland projection' },
    )
    errors.push(...paramValidation.errors)
    warnings.push(...paramValidation.warnings)
  }

  // Validate territory projections
  if (!config.territories) {
    errors.push('Split config missing territories')
    return
  }

  for (const [code, territoryConfig] of Object.entries(config.territories)) {
    // Validate projection ID using shared utility
    const projIdValidation = validateProjectionId(territoryConfig.projection?.id)
    if (!projIdValidation.isValid) {
      errors.push(`Territory ${code}: ${projIdValidation.errors.join(', ')}`)
      continue
    }

    const projection = projectionRegistry.get(territoryConfig.projection.id)
    if (!projection) {
      errors.push(`Territory ${code}: unknown projection ${territoryConfig.projection.id}`)
      continue
    }

    if (territoryConfig.projection.parameters) {
      const paramValidation = validateProjectionParameters(
        territoryConfig.projection.parameters,
        projection.family,
        { context: `territory ${code} projection` },
      )
      errors.push(...paramValidation.errors)
      warnings.push(...paramValidation.warnings)
    }
  }
}

/**
 * Validate built-in-composite view configuration
 * Checks d3-composite-projections projection ID and globalScale
 */
function validateCompositeExistingConfig(
  config: CompositeExistingViewConfig,
  errors: string[],
  warnings: string[],
): void {
  if (!config.projectionId) {
    errors.push('Composite-existing config missing projectionId')
    return
  }

  // Validate projection exists in d3-composite-projections
  const validProjections = [
    'conic-conformal-france',
    'conic-conformal-europe',
    'conic-conformal-portugal',
    'conic-conformal-spain',
    'conic-conformal-usa',
    'albersusa',
  ]

  if (!validProjections.includes(config.projectionId)) {
    warnings.push(
      `Unknown d3-composite-projection: ${config.projectionId}. `
      + `Valid options: ${validProjections.join(', ')}`,
    )
  }

  // Validate globalScale if present
  if (config.globalScale !== undefined) {
    if (typeof config.globalScale !== 'number') {
      errors.push('globalScale must be a number')
    }
    else if (config.globalScale <= 0) {
      errors.push('globalScale must be greater than 0')
    }
    else if (config.globalScale < 0.1 || config.globalScale > 10) {
      warnings.push('globalScale is outside recommended range (0.1 to 10)')
    }
  }
}
