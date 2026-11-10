import type { ValidationError } from '@atlas-composer/specification'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { PresetIssue } from '@/core/types/errors'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { parameterRegistry } from '@/core/parameters'
import { logger } from '@/utils/logger'

const debug = logger.presets.validator

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

export function schemaIssues(errors: ValidationError[]): PresetIssue[] {
  debug('Refused by the schema: %O', errors)
  return errors.map(({ code, path }) => ({ code: `PRESET_SCHEMA_${code}` as const, path: path || '/' }))
}

export function projectionIdIssue(projectionId: unknown, territory: string | null): PresetIssue | null {
  return isNonEmptyString(projectionId) ? null : { code: 'PRESET_PROJECTION_ID_INVALID', territory }
}

export function checkProjectionParameters(
  parameters: ProjectionParameters,
  projectionFamily: ProjectionFamilyType,
  territory: string | null,
  issues: PresetIssue[],
  warnings: string[],
): void {
  const context = territory ? `territory ${territory} projection` : 'unified projection'

  for (const [parameter, value] of Object.entries(parameters)) {
    const paramDef = parameterRegistry.get(parameter)
    if (!paramDef) {
      warnings.push(`Unknown parameter '${parameter}' in ${context} - will be ignored`)
      continue
    }

    const constraints = parameterRegistry.getConstraintsForFamily(parameter, projectionFamily)
    if (!constraints.relevant) {
      warnings.push(`Parameter '${parameter}' is not relevant for ${projectionFamily} projections`)
    }

    if (paramDef.type === 'tuple2' || paramDef.type === 'tuple3') {
      const expected = paramDef.type === 'tuple2' ? 2 : 3
      if (value.length !== expected) {
        issues.push({ code: 'PRESET_PARAMETER_WRONG_LENGTH', territory, parameter, expected })
      }
    }
    else if (paramDef.type === 'number') {
      if (typeof constraints.min === 'number' && value < constraints.min) {
        issues.push({ code: 'PRESET_PARAMETER_TOO_SMALL', territory, parameter, min: constraints.min })
      }
      if (typeof constraints.max === 'number' && value > constraints.max) {
        issues.push({ code: 'PRESET_PARAMETER_TOO_LARGE', territory, parameter, max: constraints.max })
      }
    }
  }
}
