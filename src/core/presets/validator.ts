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

export interface ViewPresetValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

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

export function validateCompositePreset(
  jsonText: string,
  rawPreset: CompositeCustomConfig,
): LoadResult<CompositeCustomConfig> {
  const importResult: ImportResult = CompositeImportService.importFromJSON(jsonText)

  if (!importResult.success) {
    return {
      success: false,
      errors: importResult.errors,
      warnings: importResult.warnings,
    }
  }

  const paramErrors: string[] = []
  const paramWarnings: string[] = []

  for (const territory of rawPreset.territories) {
    const family = territory.projection.family as ProjectionFamilyType

    const required = parameterRegistry.getRequired()
    for (const def of required) {
      const constraints = parameterRegistry.getConstraintsForFamily(def.key as string, family)
      const isRelevant = constraints.relevant

      if (def.requiresPreset && isRelevant) {
        let hasParameter = false

        if (def.key === 'projectionId') {
          hasParameter = territory.projection?.id !== undefined
        }
        else if (def.key === 'translateOffset') {
          hasParameter = territory.layout?.translateOffset !== undefined
        }
        else if (def.key === 'pixelClipExtent') {
          hasParameter = territory.layout?.pixelClipExtent !== undefined
        }
        else {
          hasParameter = def.key in territory.projection.parameters
        }

        if (!hasParameter) {
          paramErrors.push(`Territory ${territory.code}: missing required parameter ${def.key}`)
        }
      }
    }

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

  if (paramErrors.length > 0) {
    return {
      success: false,
      errors: [...importResult.errors, ...paramErrors],
      warnings: [...importResult.warnings, ...paramWarnings],
    }
  }

  const extendedPreset: CompositeCustomConfig = {
    ...importResult.config!,
    atlasMetadata: rawPreset.atlasMetadata,
  }

  return {
    success: true,
    data: extendedPreset,
    errors: [],
    warnings: [...importResult.warnings, ...paramWarnings],
  }
}

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

  if (!preset.id) {
    errors.push('Missing required field: id')
  }
  if (!preset.name) {
    errors.push('Missing required field: name')
  }
  if (!preset.config) {
    errors.push('Missing required field: config')
  }

  if (preset.atlasId) {
    const atlasValidation = validateAtlasId(preset.atlasId, { allowUnknown: true })
    errors.push(...atlasValidation.errors)
    warnings.push(...atlasValidation.warnings)
  }
  else {
    errors.push('Missing required field: atlasId')
  }

  const validViewModes: ViewPresetMode[] = ['unified', 'split', 'built-in-composite']
  if (preset.viewMode && !validViewModes.includes(preset.viewMode)) {
    errors.push(`Invalid view mode: ${preset.viewMode}. Must be one of: ${validViewModes.join(', ')}`)
  }
  else if (!preset.viewMode) {
    errors.push('Missing required field: viewMode')
  }

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

function validateUnifiedConfig(
  config: UnifiedViewConfig,
  errors: string[],
  warnings: string[],
): void {
  if (!config.projection) {
    errors.push('Unified config missing projection')
    return
  }

  const projIdValidation = validateProjectionId(config.projection.id)
  errors.push(...projIdValidation.errors)
  warnings.push(...projIdValidation.warnings)

  if (projIdValidation.isValid) {
    const projection = projectionRegistry.get(config.projection.id)
    if (!projection) {
      errors.push(`Unknown projection: ${config.projection.id}`)
      return
    }

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

function validateSplitConfig(
  config: SplitViewConfig,
  errors: string[],
  warnings: string[],
): void {
  if (!config.territories) {
    errors.push('Split config missing territories')
    return
  }

  for (const [code, territoryConfig] of Object.entries(config.territories)) {
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

function validateCompositeExistingConfig(
  config: CompositeExistingViewConfig,
  errors: string[],
  warnings: string[],
): void {
  if (!config.projectionId) {
    errors.push('Composite-existing config missing projectionId')
    return
  }

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
