/**
 * Preset Validation Utilities
 *
 * Shared validation functions used by both composite and view preset validators.
 * These utilities provide common validation patterns for version checking,
 * atlas ID validation, and projection parameter validation.
 */

import { getAtlasConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { parameterRegistry } from '@/core/parameters'

/**
 * Validation result structure
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean

  /** Array of error messages */
  errors: string[]

  /** Array of warning messages */
  warnings: string[]
}

/**
 * Supported preset format versions
 */
export const SUPPORTED_VERSIONS = ['1.0'] as const
export type SupportedVersion = typeof SUPPORTED_VERSIONS[number]

/**
 * Validate preset version
 *
 * @param version - Version string to validate
 * @returns Validation result
 */
export function validateVersion(version: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (typeof version !== 'string') {
    errors.push('Version must be a string')
    return { isValid: false, errors, warnings }
  }

  if (!SUPPORTED_VERSIONS.includes(version as any)) {
    errors.push(`Unsupported version '${version}'. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`)
    return { isValid: false, errors, warnings }
  }

  return { isValid: true, errors, warnings }
}

/**
 * Validate atlas ID
 *
 * @param atlasId - Atlas identifier to validate
 * @param options - Validation options
 * @param options.allowUnknown - Whether to allow unknown atlas IDs
 * @returns Validation result
 */
export function validateAtlasId(
  atlasId: unknown,
  options: { allowUnknown?: boolean } = {},
): ValidationResult {
  const { allowUnknown = false } = options
  const errors: string[] = []
  const warnings: string[] = []

  if (typeof atlasId !== 'string') {
    errors.push('Atlas ID must be a string')
    return { isValid: false, errors, warnings }
  }

  if (!atlasId || atlasId.trim() === '') {
    errors.push('Atlas ID cannot be empty')
    return { isValid: false, errors, warnings }
  }

  // Check if atlas exists in registry
  if (!allowUnknown && !isAtlasLoaded(atlasId)) {
    try {
      getAtlasConfig(atlasId)
    }
    catch {
      warnings.push(`Atlas '${atlasId}' is not registered. Configuration may not load correctly.`)
    }
  }

  return { isValid: true, errors, warnings }
}

/**
 * Validate projection ID
 *
 * @param projectionId - Projection identifier to validate
 * @returns Validation result
 */
export function validateProjectionId(projectionId: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (typeof projectionId !== 'string') {
    errors.push('Projection ID must be a string')
    return { isValid: false, errors, warnings }
  }

  if (!projectionId || projectionId.trim() === '') {
    errors.push('Projection ID cannot be empty')
    return { isValid: false, errors, warnings }
  }

  // Note: We don't validate against projection registry here because
  // projections can be custom or from d3-composite-projections
  // The projection service will handle unknown projections

  return { isValid: true, errors, warnings }
}

/**
 * Validate projection parameters against registry constraints
 *
 * @param parameters - Projection parameters to validate
 * @param projectionFamily - Projection family for family-specific validation
 * @param options - Validation options
 * @param options.context - Context string for error messages
 * @returns Validation result
 */
export function validateProjectionParameters(
  parameters: unknown,
  projectionFamily?: string,
  options: { context?: string } = {},
): ValidationResult {
  const { context = 'parameters' } = options
  const errors: string[] = []
  const warnings: string[] = []

  if (!parameters || typeof parameters !== 'object') {
    errors.push(`${context} must be an object`)
    return { isValid: false, errors, warnings }
  }

  const params = parameters as Record<string, unknown>

  // Validate each parameter against registry
  for (const [key, value] of Object.entries(params)) {
    // Skip undefined values
    if (value === undefined) {
      continue
    }

    // Check if parameter is known by registry
    const paramDef = parameterRegistry.get(key)
    if (!paramDef) {
      warnings.push(`Unknown parameter '${key}' in ${context} - will be ignored`)
      continue
    }

    // Check if parameter is relevant for the projection family (if specified)
    if (projectionFamily) {
      const constraints = parameterRegistry.getConstraintsForFamily(key, projectionFamily as any)
      if (!constraints.relevant) {
        warnings.push(`Parameter '${key}' is not relevant for ${projectionFamily} projections`)
      }
    }

    // Validate parameter value type
    const expectedType = paramDef.type
    const actualType = Array.isArray(value) ? 'array' : typeof value

    if (expectedType === 'number' && actualType !== 'number') {
      errors.push(`Parameter '${key}' must be a number, got ${actualType}`)
    }
    else if ((expectedType === 'tuple2' || expectedType === 'tuple3') && actualType !== 'array') {
      errors.push(`Parameter '${key}' must be an array, got ${actualType}`)
    }

    // Validate array length if applicable
    if ((expectedType === 'tuple2' || expectedType === 'tuple3') && Array.isArray(value)) {
      const expectedLength = expectedType === 'tuple2' ? 2 : 3
      if (value.length !== expectedLength) {
        errors.push(`Parameter '${key}' must have exactly ${expectedLength} elements`)
      }
    }

    // Validate number constraints if applicable (simplified - full validation is in parameter registry)
    if (expectedType === 'number' && typeof value === 'number' && projectionFamily) {
      const constraints = parameterRegistry.getConstraintsForFamily(key, projectionFamily as any)
      if (typeof constraints.min === 'number' && value < constraints.min) {
        errors.push(`Parameter '${key}' must be at least ${constraints.min}`)
      }
      if (typeof constraints.max === 'number' && value > constraints.max) {
        errors.push(`Parameter '${key}' must be at most ${constraints.max}`)
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate metadata object structure
 *
 * @param metadata - Metadata object to validate
 * @param requiredFields - Array of required field names
 * @returns Validation result
 */
export function validateMetadata(
  metadata: unknown,
  requiredFields: string[] = [],
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!metadata || typeof metadata !== 'object') {
    errors.push('Metadata must be an object')
    return { isValid: false, errors, warnings }
  }

  const meta = metadata as Record<string, unknown>

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in meta) || meta[field] === undefined || meta[field] === null || meta[field] === '') {
      errors.push(`Required metadata field '${field}' is missing or empty`)
    }
  }

  // Validate specific field types
  if ('exportDate' in meta && meta.exportDate !== undefined) {
    if (typeof meta.exportDate !== 'string') {
      errors.push('Metadata field \'exportDate\' must be a string')
    }
    else {
      // Try to parse as ISO date
      const date = new Date(meta.exportDate)
      if (Number.isNaN(date.getTime())) {
        warnings.push('Metadata field \'exportDate\' is not a valid ISO 8601 date')
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Combine multiple validation results
 *
 * @param results - Array of validation results to combine
 * @returns Combined validation result
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  for (const result of results) {
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}
