/**
 * Parameter Registry
 *
 * Central registry for all projection parameters with complete metadata.
 * Provides type-safe parameter definitions, validation constraints, and
 * single source of truth for parameter behavior across the application.
 */

import type { ProjectionFamilyType } from '@/core/projections/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import type { TerritoryConfig } from '@/types/territory'

/**
 * Validation result for parameter values
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
  warning?: string
}

/**
 * Parameter constraint definition
 */
export interface ParameterConstraint {
  min?: number | number[]
  max?: number | number[]
  step?: number
  allowedValues?: any[]
  relevant?: boolean
  required?: boolean
}

/**
 * Parameter definition with full metadata
 */
export interface ParameterDefinition {
  // Identity
  key: keyof ProjectionParameters
  displayName: string
  description: string

  // Type information
  type: 'number' | 'tuple2' | 'tuple3' | 'boolean' | 'custom'
  unit?: string // 'degrees', 'pixels', 'scale', 'multiplier', etc.

  // Data flow
  source: 'preset' | 'computed' // Where it comes from
  mutable: boolean // Can user change it?
  exportable: boolean // Include in export?
  requiresPreset: boolean // Must be in preset?

  // Validation
  constraints: ParameterConstraint | ((family: ProjectionFamilyType) => ParameterConstraint)

  // Relevance
  relevantFor: ProjectionFamilyType[] | 'all'

  // Defaults
  defaultValue?: any
  computeDefault?: (territory: TerritoryConfig) => any
}

/**
 * Central parameter registry
 */
export class ParameterRegistry {
  private definitions = new Map<string, ParameterDefinition>()

  /**
   * Register a parameter definition
   */
  register(def: ParameterDefinition): void {
    this.definitions.set(def.key as string, def)
  }

  /**
   * Get a parameter definition by key
   */
  get(key: string): ParameterDefinition | undefined {
    return this.definitions.get(key)
  }

  /**
   * Get all parameter definitions
   */
  getAll(): ParameterDefinition[] {
    return Array.from(this.definitions.values())
  }

  /**
   * Get parameters that should be included in export
   */
  getExportable(): ParameterDefinition[] {
    return this.getAll().filter(def => def.exportable)
  }

  /**
   * Get parameters that must be present in presets
   */
  getRequired(): ParameterDefinition[] {
    return this.getAll().filter(def => def.requiresPreset)
  }

  /**
   * Get parameters relevant for a specific projection family
   */
  getRelevant(family: ProjectionFamilyType): ParameterDefinition[] {
    return this.getAll().filter((def) => {
      if (def.relevantFor === 'all')
        return true
      return (def.relevantFor as ProjectionFamilyType[]).includes(family)
    })
  }

  /**
   * Validate a single parameter value
   */
  validate(key: string, value: any, family: ProjectionFamilyType): ValidationResult {
    const def = this.get(key)
    if (!def) {
      return { isValid: false, error: `Unknown parameter: ${key}` }
    }

    // Check if parameter is relevant for this family
    if (def.relevantFor !== 'all' && !(def.relevantFor as ProjectionFamilyType[]).includes(family)) {
      return { isValid: true, warning: `Parameter ${key} is not relevant for ${family} projections` }
    }

    // Get constraints for this family
    const constraints = typeof def.constraints === 'function'
      ? def.constraints(family)
      : def.constraints

    // Skip validation if not relevant for this family
    if (constraints.relevant === false) {
      return { isValid: true }
    }

    // Validate based on type
    return this.validateByType(def, value, constraints)
  }

  /**
   * Validate multiple parameters
   */
  validateParameters(params: Partial<ProjectionParameters>, family: ProjectionFamilyType): ValidationResult[] {
    const results: ValidationResult[] = []

    for (const [key, value] of Object.entries(params)) {
      const result = this.validate(key, value, family)
      if (!result.isValid || result.warning) {
        results.push(result)
      }
    }

    return results
  }

  /**
   * Get default parameters for a territory and projection family
   */
  getDefaults(territory: TerritoryConfig, family: ProjectionFamilyType): ProjectionParameters {
    const defaults: ProjectionParameters = {}

    for (const def of this.getRelevant(family)) {
      if (def.defaultValue !== undefined) {
        defaults[def.key] = def.defaultValue
      }
      else if (def.computeDefault) {
        defaults[def.key] = def.computeDefault(territory)
      }
    }

    return defaults
  }

  /**
   * Check if registry contains all required parameters from ProjectionParameters interface
   */
  validateCompleteness(): ValidationResult[] {
    const errors: ValidationResult[] = []

    // Get a sample ProjectionParameters object keys (this would be done statically in real impl)
    const requiredKeys = [
      'center',
      'rotate',
      'parallels',
      'scale',
      'translate',
      'translateOffset',
      'clipAngle',
      'precision',
      'baseScale',
      'scaleMultiplier',
    ]

    for (const key of requiredKeys) {
      if (!this.get(key)) {
        errors.push({
          isValid: false,
          error: `Missing parameter definition for: ${key}`,
        })
      }
    }

    return errors
  }

  private validateByType(def: ParameterDefinition, value: any, constraints: ParameterConstraint): ValidationResult {
    if (value === null || value === undefined) {
      if (constraints.required) {
        return { isValid: false, error: `Parameter ${def.key} is required` }
      }
      return { isValid: true }
    }

    switch (def.type) {
      case 'number':
        return this.validateNumber(def, value, constraints)
      case 'tuple2':
        return this.validateTuple2(def, value, constraints)
      case 'tuple3':
        return this.validateTuple3(def, value, constraints)
      case 'boolean':
        return this.validateBoolean(def, value, constraints)
      case 'custom':
        return { isValid: true } // Custom validation would be handled elsewhere
      default:
        return { isValid: false, error: `Unknown parameter type: ${def.type}` }
    }
  }

  private validateNumber(def: ParameterDefinition, value: any, constraints: ParameterConstraint): ValidationResult {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return { isValid: false, error: `Parameter ${def.key} must be a valid number` }
    }

    if (constraints.min !== undefined && value < (constraints.min as number)) {
      return { isValid: false, error: `Parameter ${def.key} must be >= ${constraints.min}` }
    }

    if (constraints.max !== undefined && value > (constraints.max as number)) {
      return { isValid: false, error: `Parameter ${def.key} must be <= ${constraints.max}` }
    }

    if (constraints.allowedValues && !constraints.allowedValues.includes(value)) {
      return { isValid: false, error: `Parameter ${def.key} must be one of: ${constraints.allowedValues.join(', ')}` }
    }

    return { isValid: true }
  }

  private validateTuple2(def: ParameterDefinition, value: any, constraints: ParameterConstraint): ValidationResult {
    if (!Array.isArray(value) || value.length !== 2) {
      return { isValid: false, error: `Parameter ${def.key} must be an array of 2 numbers` }
    }

    if (!value.every(v => typeof v === 'number' && !Number.isNaN(v))) {
      return { isValid: false, error: `Parameter ${def.key} must contain valid numbers` }
    }

    if (constraints.min && Array.isArray(constraints.min)) {
      const minArray = constraints.min as number[]
      for (let i = 0; i < 2; i++) {
        const minValue = minArray[i]
        if (minValue !== undefined && value[i] < minValue) {
          return { isValid: false, error: `Parameter ${def.key}[${i}] must be >= ${minValue}` }
        }
      }
    }

    if (constraints.max && Array.isArray(constraints.max)) {
      const maxArray = constraints.max as number[]
      for (let i = 0; i < 2; i++) {
        const maxValue = maxArray[i]
        if (maxValue !== undefined && value[i] > maxValue) {
          return { isValid: false, error: `Parameter ${def.key}[${i}] must be <= ${maxValue}` }
        }
      }
    }

    return { isValid: true }
  }

  private validateTuple3(def: ParameterDefinition, value: any, constraints: ParameterConstraint): ValidationResult {
    if (!Array.isArray(value) || (value.length !== 3 && value.length !== 2)) {
      return { isValid: false, error: `Parameter ${def.key} must be an array of 2 or 3 numbers` }
    }

    if (!value.every(v => typeof v === 'number' && !Number.isNaN(v))) {
      return { isValid: false, error: `Parameter ${def.key} must contain valid numbers` }
    }

    if (constraints.min && Array.isArray(constraints.min)) {
      const minArray = constraints.min as number[]
      for (let i = 0; i < Math.min(value.length, minArray.length); i++) {
        const minValue = minArray[i]
        if (minValue !== undefined && value[i] < minValue) {
          return { isValid: false, error: `Parameter ${def.key}[${i}] must be >= ${minValue}` }
        }
      }
    }

    if (constraints.max && Array.isArray(constraints.max)) {
      const maxArray = constraints.max as number[]
      for (let i = 0; i < Math.min(value.length, maxArray.length); i++) {
        const maxValue = maxArray[i]
        if (maxValue !== undefined && value[i] > maxValue) {
          return { isValid: false, error: `Parameter ${def.key}[${i}] must be <= ${maxValue}` }
        }
      }
    }

    return { isValid: true }
  }

  private validateBoolean(def: ParameterDefinition, value: any, _constraints: ParameterConstraint): ValidationResult {
    if (typeof value !== 'boolean') {
      return { isValid: false, error: `Parameter ${def.key} must be a boolean` }
    }

    return { isValid: true }
  }
}

// Singleton instance
export const parameterRegistry = new ParameterRegistry()
