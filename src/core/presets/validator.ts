import type {
  CompositeCustomConfig,
  CompositeExistingViewConfig,
  SplitViewConfig,
  UnifiedViewConfig,
  ViewPresetMode,
} from './types'
import type { PresetIssue } from '@/core/types/errors'
import type { Result } from '@/core/types/result'

import { validateConfig } from '@atlas-composer/specification'
import { parameterRegistry } from '@/core/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { err, ok } from '@/core/types/result'
import { logger } from '@/utils/logger'
import {
  atlasIdIssue,
  checkProjectionParameters,
  projectionIdIssue,
  schemaIssues,
} from './validation-utils'

const debug = logger.presets.validator

function logWarnings(warnings: string[]): void {
  if (warnings.length > 0) {
    debug('Preset warnings: %O', warnings)
  }
}

export function validateCompositePreset(
  rawPreset: CompositeCustomConfig,
): Result<CompositeCustomConfig, PresetIssue[]> {
  const validation = validateConfig(rawPreset)

  if (!validation.valid) {
    return err(schemaIssues(validation.errors))
  }

  const issues: PresetIssue[] = []
  const warnings: string[] = []

  for (const territory of rawPreset.territories) {
    const family = territory.projection.family

    const idIssue = projectionIdIssue(territory.projection.id, territory.code)
    if (idIssue) {
      issues.push(idIssue)
    }

    const required = parameterRegistry.getRequired()
    for (const def of required) {
      if (def.key === 'rotate' || def.key === 'center')
        continue

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
          issues.push({ code: 'PRESET_PARAMETER_REQUIRED', territory: territory.code, parameter: def.key as string })
        }
      }
    }

    const { rotate, center } = territory.projection.parameters
    if (rotate === undefined && center === undefined) {
      issues.push({ code: 'PRESET_POSITIONING_REQUIRED', territory: territory.code })
    }

    const validationResults = parameterRegistry.validateParameters(
      territory.projection.parameters,
      family,
    )
    for (const result of validationResults) {
      if (!result.isValid) {
        warnings.push(`Territory ${territory.code}: ${result.error}`)
      }
    }
  }

  logWarnings(warnings)

  return issues.length === 0 ? ok(rawPreset) : err(issues)
}

export function validateViewPreset(preset: {
  id: string
  name: string
  description?: string
  atlasId: string
  viewMode: ViewPresetMode
  config: UnifiedViewConfig | SplitViewConfig | CompositeExistingViewConfig
}): Result<void, PresetIssue[]> {
  const issues: PresetIssue[] = []
  const warnings: string[] = []

  if (!preset.id) {
    issues.push({ code: 'PRESET_FIELD_MISSING', field: 'id' })
  }
  if (!preset.name) {
    issues.push({ code: 'PRESET_FIELD_MISSING', field: 'name' })
  }
  if (!preset.config) {
    issues.push({ code: 'PRESET_FIELD_MISSING', field: 'config' })
  }

  if (preset.atlasId) {
    const issue = atlasIdIssue(preset.atlasId)
    if (issue) {
      issues.push(issue)
    }
  }
  else {
    issues.push({ code: 'PRESET_FIELD_MISSING', field: 'atlasId' })
  }

  const validViewModes: ViewPresetMode[] = ['unified', 'split', 'built-in-composite']
  if (preset.viewMode && !validViewModes.includes(preset.viewMode)) {
    issues.push({ code: 'PRESET_VIEW_MODE_INVALID', viewMode: preset.viewMode })
  }
  else if (!preset.viewMode) {
    issues.push({ code: 'PRESET_FIELD_MISSING', field: 'viewMode' })
  }

  if (preset.config) {
    if (preset.viewMode === 'unified') {
      validateUnifiedConfig(preset.config as UnifiedViewConfig, issues, warnings)
    }
    else if (preset.viewMode === 'split') {
      validateSplitConfig(preset.config as SplitViewConfig, issues, warnings)
    }
    else if (preset.viewMode === 'built-in-composite') {
      validateCompositeExistingConfig(preset.config as CompositeExistingViewConfig, issues, warnings)
    }
  }

  logWarnings(warnings)

  return issues.length === 0 ? ok(undefined) : err(issues)
}

function validateUnifiedConfig(
  config: UnifiedViewConfig,
  issues: PresetIssue[],
  warnings: string[],
): void {
  if (!config.projection) {
    issues.push({ code: 'PRESET_PROJECTION_MISSING' })
    return
  }

  const idIssue = projectionIdIssue(config.projection.id, null)
  if (idIssue) {
    issues.push(idIssue)
    return
  }

  const projection = projectionRegistry.get(config.projection.id)
  if (!projection) {
    issues.push({ code: 'PRESET_PROJECTION_UNKNOWN', territory: null, projectionId: config.projection.id })
    return
  }

  if (config.projection.parameters) {
    checkProjectionParameters(config.projection.parameters, projection.family, null, issues, warnings)
  }
}

function validateSplitConfig(
  config: SplitViewConfig,
  issues: PresetIssue[],
  warnings: string[],
): void {
  if (!config.territories) {
    issues.push({ code: 'PRESET_TERRITORIES_MISSING' })
    return
  }

  for (const [code, territoryConfig] of Object.entries(config.territories)) {
    const idIssue = projectionIdIssue(territoryConfig?.projection?.id, code)
    if (idIssue) {
      issues.push(idIssue)
      continue
    }

    const projection = projectionRegistry.get(territoryConfig.projection.id)
    if (!projection) {
      issues.push({ code: 'PRESET_PROJECTION_UNKNOWN', territory: code, projectionId: territoryConfig.projection.id })
      continue
    }

    if (territoryConfig.projection.parameters) {
      checkProjectionParameters(territoryConfig.projection.parameters, projection.family, code, issues, warnings)
    }
  }
}

function validateCompositeExistingConfig(
  config: CompositeExistingViewConfig,
  issues: PresetIssue[],
  warnings: string[],
): void {
  if (!config.projectionId) {
    issues.push({ code: 'PRESET_COMPOSITE_PROJECTION_MISSING' })
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
      issues.push({ code: 'PRESET_GLOBAL_SCALE_NOT_NUMBER' })
    }
    else if (config.globalScale <= 0) {
      issues.push({ code: 'PRESET_GLOBAL_SCALE_NOT_POSITIVE' })
    }
    else if (config.globalScale < 0.1 || config.globalScale > 10) {
      warnings.push('globalScale is outside recommended range (0.1 to 10)')
    }
  }
}
