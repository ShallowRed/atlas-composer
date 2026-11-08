import type { ProjectionFamilyType } from '@/core/projections/types'
import type { PresetIssue } from '@/core/types/errors'
import { parameterRegistry } from '@/core/parameters'

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

export function atlasIdIssue(atlasId: unknown): PresetIssue | null {
  return isNonEmptyString(atlasId) ? null : { code: 'PRESET_ATLAS_ID_INVALID' }
}

export function projectionIdIssue(projectionId: unknown, territory: string | null): PresetIssue | null {
  return isNonEmptyString(projectionId) ? null : { code: 'PRESET_PROJECTION_ID_INVALID', territory }
}

export function checkProjectionParameters(
  parameters: unknown,
  projectionFamily: ProjectionFamilyType,
  territory: string | null,
  issues: PresetIssue[],
  warnings: string[],
): void {
  if (!parameters || typeof parameters !== 'object') {
    issues.push({ code: 'PRESET_PARAMETERS_NOT_OBJECT', territory })
    return
  }

  const context = territory ? `territory ${territory} projection` : 'unified projection'

  for (const [parameter, value] of Object.entries(parameters)) {
    if (value === undefined) {
      continue
    }

    const paramDef = parameterRegistry.get(parameter)
    if (!paramDef) {
      warnings.push(`Unknown parameter '${parameter}' in ${context} - will be ignored`)
      continue
    }

    const constraints = parameterRegistry.getConstraintsForFamily(parameter, projectionFamily)
    if (!constraints.relevant) {
      warnings.push(`Parameter '${parameter}' is not relevant for ${projectionFamily} projections`)
    }

    const expectedType = paramDef.type
    const actualType = Array.isArray(value) ? 'array' : typeof value
    const isTuple = expectedType === 'tuple2' || expectedType === 'tuple3'

    if (expectedType === 'number' && actualType !== 'number') {
      issues.push({ code: 'PRESET_PARAMETER_NOT_NUMBER', territory, parameter, actualType })
    }
    else if (isTuple && actualType !== 'array') {
      issues.push({ code: 'PRESET_PARAMETER_NOT_ARRAY', territory, parameter, actualType })
    }

    if (isTuple && Array.isArray(value)) {
      const expected = expectedType === 'tuple2' ? 2 : 3
      if (value.length !== expected) {
        issues.push({ code: 'PRESET_PARAMETER_WRONG_LENGTH', territory, parameter, expected })
      }
    }

    if (expectedType === 'number' && typeof value === 'number') {
      if (typeof constraints.min === 'number' && value < constraints.min) {
        issues.push({ code: 'PRESET_PARAMETER_TOO_SMALL', territory, parameter, min: constraints.min })
      }
      if (typeof constraints.max === 'number' && value > constraints.max) {
        issues.push({ code: 'PRESET_PARAMETER_TOO_LARGE', territory, parameter, max: constraints.max })
      }
    }
  }
}
