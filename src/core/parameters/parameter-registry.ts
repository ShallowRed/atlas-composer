import type { ProjectionFamilyType } from '@/core/projections/types'
import type { ParameterIssue } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { err, ok } from '@/core/types/result'

interface ParameterConstraint {
  min?: number | number[]
  max?: number | number[]
  step?: number
  relevant?: boolean
  required?: boolean
}

export interface FamilyConstraint {
  relevant: boolean
  required: boolean
  min?: number | number[]
  max?: number | number[]
  step?: number
  validate?: (value: any) => Result<void, ParameterIssue>
}

export interface FamilyConstraints {
  [family: string]: FamilyConstraint
}

export interface ParameterDefinition {
  key: keyof ProjectionParameters
  displayName: string
  description: string

  type: 'number' | 'tuple2' | 'tuple3' | 'custom'
  unit?: string // 'degrees', 'pixels', 'scale', 'multiplier', etc.

  source: 'preset' | 'computed'
  mutable: boolean
  exportable: boolean
  requiresPreset: boolean

  familyConstraints?: FamilyConstraints

  defaultValue?: any
}

class ParameterRegistry {
  private definitions = new Map<string, ParameterDefinition>()

  register(def: ParameterDefinition): void {
    this.definitions.set(def.key as string, def)
  }

  get(key: string): ParameterDefinition | undefined {
    return this.definitions.get(key)
  }

  getDefaultValue<K extends keyof ProjectionParameters>(key: K): NonNullable<ProjectionParameters[K]> {
    const defaultValue = this.get(key as string)?.defaultValue
    if (defaultValue === undefined) {
      throw new Error(`Parameter without default value: ${String(key)}`)
    }
    return defaultValue
  }

  getAll(): ParameterDefinition[] {
    return Array.from(this.definitions.values())
  }

  getExportable(): ParameterDefinition[] {
    return this.getAll().filter(def => def.exportable)
  }

  getRequired(): ParameterDefinition[] {
    return this.getAll().filter(def => def.requiresPreset)
  }

  getRelevant(family: ProjectionFamilyType): ParameterDefinition[] {
    return this.getAll().filter((def) => {
      const familyConstraint = def.familyConstraints?.[family]
      return familyConstraint?.relevant || false
    })
  }

  getConstraintsForFamily(key: string, family: ProjectionFamilyType): ParameterConstraint {
    const def = this.get(key)
    if (!def) {
      return { relevant: false, required: false }
    }

    const familyConstraint = def.familyConstraints?.[family]
    if (familyConstraint) {
      return {
        relevant: familyConstraint.relevant,
        required: familyConstraint.required,
        min: familyConstraint.min,
        max: familyConstraint.max,
        step: familyConstraint.step,
      }
    }

    return { relevant: false, required: false }
  }

  validate(key: string, value: any, family: ProjectionFamilyType): Result<void, ParameterIssue> {
    const def = this.get(key)
    if (!def) {
      throw new Error(`Unknown parameter: ${key}`)
    }

    const validateForFamily = def.familyConstraints?.[family]?.validate
    return validateForFamily
      ? validateForFamily(value)
      : this.validateByType(def, value, this.getConstraintsForFamily(key, family))
  }

  validateParameters(params: Partial<ProjectionParameters>, family: ProjectionFamilyType): ParameterIssue[] {
    return Object.entries(params).flatMap(([key, value]) => {
      if (!this.getConstraintsForFamily(key, family).relevant) {
        return []
      }

      const result = this.validate(key, value, family)
      return result.ok ? [] : [result.error]
    })
  }

  private validateByType(def: ParameterDefinition, value: any, constraints: ParameterConstraint): Result<void, ParameterIssue> {
    const parameter = def.key as string
    if (value === null || value === undefined) {
      return constraints.required ? err({ code: 'PARAMETER_REQUIRED', parameter }) : ok(undefined)
    }

    switch (def.type) {
      case 'number':
        return this.validateNumber(parameter, value, constraints)
      case 'tuple2':
        return Array.isArray(value) && value.length === 2
          ? this.validateItems(parameter, value, constraints)
          : err({ code: 'PARAMETER_NOT_PAIR', parameter })
      case 'tuple3':
        return Array.isArray(value) && (value.length === 3 || value.length === 2)
          ? this.validateItems(parameter, value, constraints)
          : err({ code: 'PARAMETER_NOT_PAIR_OR_TRIPLE', parameter })
      case 'custom':
        return ok(undefined)
    }
  }

  private validateNumber(parameter: string, value: any, constraints: ParameterConstraint): Result<void, ParameterIssue> {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return err({ code: 'PARAMETER_NOT_NUMBER', parameter })
    }

    if (constraints.min !== undefined && value < (constraints.min as number)) {
      return err({ code: 'PARAMETER_TOO_SMALL', parameter, min: constraints.min as number })
    }

    if (constraints.max !== undefined && value > (constraints.max as number)) {
      return err({ code: 'PARAMETER_TOO_LARGE', parameter, max: constraints.max as number })
    }

    return ok(undefined)
  }

  private validateItems(parameter: string, value: unknown[], constraints: ParameterConstraint): Result<void, ParameterIssue> {
    if (!value.every(item => typeof item === 'number' && !Number.isNaN(item))) {
      return err({ code: 'PARAMETER_ITEMS_NOT_NUMBERS', parameter })
    }

    const items = value as number[]
    const minItems = Array.isArray(constraints.min) ? constraints.min : []
    const maxItems = Array.isArray(constraints.max) ? constraints.max : []

    for (const [index, item] of items.entries()) {
      const min = minItems[index]
      if (min !== undefined && item < min) {
        return err({ code: 'PARAMETER_ITEM_TOO_SMALL', parameter, position: index + 1, min })
      }

      const max = maxItems[index]
      if (max !== undefined && item > max) {
        return err({ code: 'PARAMETER_ITEM_TOO_LARGE', parameter, position: index + 1, max })
      }
    }

    return ok(undefined)
  }
}

export const parameterRegistry = new ParameterRegistry()
