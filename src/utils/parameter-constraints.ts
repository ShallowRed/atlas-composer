import type { ProjectionFamilyType } from '@/core/projections/types'
import type { BaseProjectionParameters } from '@/types/projection-parameters'

/**
 * Parameter constraint definitions by projection family
 *
 * Simplified constraint system for parameter validation and UI controls.
 */

/**
 * Simple parameter constraint definition
 */
export interface SimpleParameterConstraint {
  /** Parameter key */
  parameter: keyof BaseProjectionParameters
  /** Whether the parameter is relevant for this family */
  relevant: boolean
  /** Default value */
  defaultValue?: unknown
  /** Minimum value (for scalar parameters) */
  min?: number
  /** Maximum value (for scalar parameters) */
  max?: number
  /** Step increment */
  step?: number
}

/**
 * Parameter relevance by projection family
 */
const PARAMETER_RELEVANCE: Record<ProjectionFamilyType, Record<keyof BaseProjectionParameters, boolean>> = {
  AZIMUTHAL: {
    center: true,
    rotate: true,
    scale: true,
    clipAngle: true,
    precision: true,
    translate: true,
    parallels: false,
  },
  CYLINDRICAL: {
    center: true,
    rotate: true,
    scale: true,
    precision: true,
    translate: true,
    clipAngle: false,
    parallels: false,
  },
  PSEUDOCYLINDRICAL: {
    center: true,
    rotate: true,
    scale: true,
    precision: true,
    translate: true,
    clipAngle: false,
    parallels: false,
  },
  CONIC: {
    center: true,
    rotate: true,
    parallels: true,
    scale: true,
    precision: true,
    translate: true,
    clipAngle: false,
  },
  POLYHEDRAL: {
    center: true,
    rotate: true,
    scale: true,
    precision: true,
    translate: true,
    clipAngle: false,
    parallels: false,
  },
  COMPOSITE: {
    center: true,
    rotate: true,
    scale: true,
    precision: true,
    translate: true,
    clipAngle: false,
    parallels: false,
  },
  OTHER: {
    center: true,
    rotate: true,
    scale: true,
    precision: true,
    translate: true,
    clipAngle: true,
    parallels: true,
  },
}

/**
 * Default parameter values
 */
const PARAMETER_DEFAULTS: Record<keyof BaseProjectionParameters, unknown> = {
  center: [0, 0],
  rotate: [0, 0, 0],
  parallels: [29.5, 45.5],
  scale: 1000,
  clipAngle: 90,
  precision: 2.5,
  translate: [0, 0],
}

/**
 * Parameter ranges for UI controls
 */
const PARAMETER_RANGES: Record<keyof BaseProjectionParameters, { min: number, max: number, step: number }> = {
  center: { min: -180, max: 180, step: 0.1 },
  rotate: { min: -180, max: 180, step: 0.1 },
  parallels: { min: -90, max: 90, step: 0.1 },
  scale: { min: 1, max: 10000, step: 1 },
  clipAngle: { min: 0, max: 180, step: 0.1 },
  precision: { min: 0.01, max: 10, step: 0.01 },
  translate: { min: -2000, max: 2000, step: 1 },
}

/**
 * Get parameter constraints for a specific projection family
 */
export function getParameterConstraints(family: ProjectionFamilyType): Record<keyof BaseProjectionParameters, SimpleParameterConstraint> {
  const relevance = PARAMETER_RELEVANCE[family] || PARAMETER_RELEVANCE.OTHER
  const constraints: Record<keyof BaseProjectionParameters, SimpleParameterConstraint> = {} as Record<keyof BaseProjectionParameters, SimpleParameterConstraint>

  // Build constraints for each parameter
  for (const [paramKey, isRelevant] of Object.entries(relevance)) {
    const key = paramKey as keyof BaseProjectionParameters
    const range = PARAMETER_RANGES[key]
    const defaultValue = PARAMETER_DEFAULTS[key]

    constraints[key] = {
      parameter: key,
      relevant: isRelevant,
      defaultValue,
      min: range.min,
      max: range.max,
      step: range.step,
    }
  }

  return constraints
}

/**
 * Check if a parameter is relevant for a given projection family
 */
export function isParameterRelevant(
  family: ProjectionFamilyType,
  parameter: keyof BaseProjectionParameters,
): boolean {
  const relevance = PARAMETER_RELEVANCE[family] || PARAMETER_RELEVANCE.OTHER
  return relevance[parameter] || false
}

/**
 * Get default value for a parameter in a specific projection family
 */
export function getParameterDefault(
  family: ProjectionFamilyType,
  parameter: keyof BaseProjectionParameters,
): unknown {
  const constraints = getParameterConstraints(family)
  return constraints[parameter]?.defaultValue
}

/**
 * Basic parameter value validation
 */
export function validateParameterValue(
  family: ProjectionFamilyType,
  parameter: keyof BaseProjectionParameters,
  value: unknown,
): { isValid: boolean, error?: string, suggestion?: unknown } {
  const constraints = getParameterConstraints(family)
  const paramConstraint = constraints[parameter]

  if (!paramConstraint || !paramConstraint.relevant) {
    return {
      isValid: false,
      error: `Parameter '${parameter}' is not relevant for ${family} projections`,
    }
  }

  // Array parameters (center, rotate, parallels, translate)
  if (parameter === 'center' || parameter === 'parallels' || parameter === 'translate') {
    if (!Array.isArray(value) || value.length !== 2) {
      return {
        isValid: false,
        error: `Parameter '${parameter}' must be an array of 2 numbers`,
        suggestion: paramConstraint.defaultValue,
      }
    }
  }
  else if (parameter === 'rotate') {
    if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
      return {
        isValid: false,
        error: `Parameter '${parameter}' must be an array of 2 or 3 numbers`,
        suggestion: paramConstraint.defaultValue,
      }
    }
  }
  else {
    // Scalar parameters
    if (typeof value !== 'number') {
      return {
        isValid: false,
        error: `Parameter '${parameter}' must be a number`,
        suggestion: paramConstraint.defaultValue,
      }
    }

    const numValue = value as number
    const min = paramConstraint.min!
    const max = paramConstraint.max!

    if (numValue < min || numValue > max) {
      return {
        isValid: false,
        error: `Parameter '${parameter}' must be between ${min} and ${max}`,
        suggestion: paramConstraint.defaultValue,
      }
    }
  }

  return { isValid: true }
}
