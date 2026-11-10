import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { UnifiedViewConfig, ViewPreset } from './types'
import type { PresetIssue } from '@/core/types/errors'
import type { Result } from '@/core/types/result'

import { validateConfig } from '@atlas-composer/specification'
import { parameterRegistry } from '@/core/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionStrategy } from '@/core/projections/types'
import { err, ok } from '@/core/types/result'
import { logger } from '@/utils/logger'
import { checkProjectionParameters, projectionIdIssue, schemaIssues } from './validation-utils'

const debug = logger.presets.validator

function logWarnings(warnings: string[]): void {
  if (warnings.length > 0) {
    debug('Preset warnings: %O', warnings)
  }
}

export function validateCompositePreset(
  rawPreset: CompositeProjectionConfig,
): Result<CompositeProjectionConfig, PresetIssue[]> {
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

    for (const issue of parameterRegistry.validateParameters(territory.projection.parameters, family)) {
      warnings.push(`Territory ${territory.code}: ${JSON.stringify(issue)}`)
    }
  }

  logWarnings(warnings)

  return issues.length === 0 ? ok(rawPreset) : err(issues)
}

export function validateViewPreset(preset: ViewPreset): Result<void, PresetIssue[]> {
  const issues: PresetIssue[] = []
  const warnings: string[] = []

  switch (preset.type) {
    case 'unified':
      checkProjection(preset.config.projection, null, issues, warnings)
      break
    case 'split':
      for (const [code, { projection }] of Object.entries(preset.config.territories)) {
        checkProjection(projection, code, issues, warnings)
      }
      break
    case 'built-in-composite':
      if (projectionRegistry.get(preset.config.projectionId)?.strategy !== ProjectionStrategy.D3_COMPOSITE) {
        warnings.push(`Unknown d3-composite-projection: ${preset.config.projectionId}`)
      }
      break
  }

  logWarnings(warnings)

  return issues.length === 0 ? ok(undefined) : err(issues)
}

function checkProjection(
  { id, parameters }: UnifiedViewConfig['projection'],
  territory: string | null,
  issues: PresetIssue[],
  warnings: string[],
): void {
  const projection = projectionRegistry.get(id)
  if (!projection) {
    issues.push({ code: 'PRESET_PROJECTION_UNKNOWN', territory, projectionId: id })
    return
  }

  checkProjectionParameters(parameters, projection.family, territory, issues, warnings)
}
