/**
 * Validation utilities for composite projection configurations.
 */

import { isCompositeProjectionConfig, MIN_SUPPORTED_VERSION } from './types.js'

/**
 * Validation error with path and message.
 */
export interface ValidationError {
  /** JSON path to the error location */
  path: string
  /** Human-readable error message */
  message: string
  /** Error code for programmatic handling */
  code: 'INVALID_TYPE' | 'MISSING_FIELD' | 'INVALID_VALUE' | 'VERSION_UNSUPPORTED'
}

/**
 * Result of configuration validation.
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean
  /** List of validation errors (empty if valid) */
  errors: ValidationError[]
  /** List of warnings (non-fatal issues) */
  warnings: string[]
}

/**
 * Validate the specification version.
 *
 * @param version - Version string to validate
 * @returns true if version is supported
 */
export function validateVersion(version: string): boolean {
  const [major] = version.split('.').map(Number)
  const [minMajor] = MIN_SUPPORTED_VERSION.split('.').map(Number)
  return major >= minMajor
}

/**
 * Validate a composite projection configuration.
 *
 * Performs structural validation without JSON Schema.
 * For full schema validation, use the JSON Schema files directly.
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * import { validateConfig } from '@atlas-composer/specification'
 *
 * const result = validateConfig(config)
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export function validateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Basic type check
  if (!isCompositeProjectionConfig(config)) {
    errors.push({
      path: '',
      message: 'Invalid configuration structure',
      code: 'INVALID_TYPE',
    })
    return { valid: false, errors, warnings }
  }

  // Version check
  if (!validateVersion(config.version)) {
    errors.push({
      path: 'version',
      message: `Unsupported version "${config.version}". Minimum: ${MIN_SUPPORTED_VERSION}`,
      code: 'VERSION_UNSUPPORTED',
    })
  }

  // Metadata validation
  if (!config.metadata.atlasId) {
    errors.push({
      path: 'metadata.atlasId',
      message: 'atlasId is required',
      code: 'MISSING_FIELD',
    })
  }

  // Reference scale validation
  if (config.referenceScale <= 0) {
    errors.push({
      path: 'referenceScale',
      message: 'referenceScale must be positive',
      code: 'INVALID_VALUE',
    })
  }

  // Canvas dimensions validation
  if (config.canvasDimensions.width <= 0 || config.canvasDimensions.height <= 0) {
    errors.push({
      path: 'canvasDimensions',
      message: 'Canvas dimensions must be positive',
      code: 'INVALID_VALUE',
    })
  }

  // Territories validation
  if (config.territories.length === 0) {
    errors.push({
      path: 'territories',
      message: 'At least one territory is required',
      code: 'INVALID_VALUE',
    })
  }

  // Validate each territory
  const codes = new Set<string>()
  config.territories.forEach((territory, index) => {
    const path = `territories[${index}]`

    // Check for duplicate codes
    if (codes.has(territory.code)) {
      errors.push({
        path: `${path}.code`,
        message: `Duplicate territory code: ${territory.code}`,
        code: 'INVALID_VALUE',
      })
    }
    codes.add(territory.code)

    // Validate projection
    if (!territory.projection.id) {
      errors.push({
        path: `${path}.projection.id`,
        message: 'Projection ID is required',
        code: 'MISSING_FIELD',
      })
    }

    // Validate bounds
    if (territory.bounds) {
      const [[minLon, minLat], [maxLon, maxLat]] = territory.bounds
      if (minLon >= maxLon || minLat >= maxLat) {
        warnings.push(`${path}.bounds: Invalid bounds order (min >= max)`)
      }
      if (minLon < -180 || maxLon > 180) {
        warnings.push(`${path}.bounds: Longitude out of range [-180, 180]`)
      }
      if (minLat < -90 || maxLat > 90) {
        warnings.push(`${path}.bounds: Latitude out of range [-90, 90]`)
      }
    }

    // Validate layout
    if (!territory.layout.translateOffset) {
      errors.push({
        path: `${path}.layout.translateOffset`,
        message: 'translateOffset is required',
        code: 'MISSING_FIELD',
      })
    }
    if (!territory.layout.pixelClipExtent) {
      errors.push({
        path: `${path}.layout.pixelClipExtent`,
        message: 'pixelClipExtent is required',
        code: 'MISSING_FIELD',
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
