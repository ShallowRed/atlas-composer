/**
 * Parameter Validator Service
 *
 * Provides comprehensive validation for projection parameters including
 * compatibility checks, constraint validation, and dependency validation.
 */

import type { ProjectionFamilyType } from '@/core/projections/types'
import type {
  BaseProjectionParameters,
  ParameterConstraints,
  ParameterValidationResult,
  ProjectionFamilyConstraints,
} from '@/types/projection-parameters'

import { getRelevantParameters } from '@/core/projections/parameters'

/**
 * Parameter validation rules for different projection families
 */
const PARAMETER_CONSTRAINTS: Record<ProjectionFamilyType, Partial<Record<keyof BaseProjectionParameters, ParameterConstraints>>> = {
  CYLINDRICAL: {
    center: {
      parameter: 'center',
      relevant: false, // Uses rotation instead
      required: false,
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
      validate: (value) => {
        if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
          return { isValid: false, error: 'Rotation must be [longitude, latitude] or [longitude, latitude, gamma]' }
        }
        const [lon, lat] = value
        if (lon < -180 || lon > 180) {
          return { isValid: false, error: 'Longitude must be between -180 and 180' }
        }
        if (lat < -90 || lat > 90) {
          return { isValid: false, error: 'Latitude must be between -90 and 90' }
        }
        return { isValid: true }
      },
    },
    scale: {
      parameter: 'scale',
      relevant: true,
      min: 1,
      max: 100000,
      step: 1,
      required: false,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false, // Not used in cylindrical projections
      required: false,
    },
  },

  PSEUDOCYLINDRICAL: {
    center: {
      parameter: 'center',
      relevant: false, // Uses rotation instead
      required: false,
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
      validate: (value) => {
        if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
          return { isValid: false, error: 'Rotation must be [longitude, latitude] or [longitude, latitude, gamma]' }
        }
        return { isValid: true }
      },
    },
    scale: {
      parameter: 'scale',
      relevant: true,
      min: 1,
      max: 100000,
      step: 1,
      required: false,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
    },
  },

  CONIC: {
    center: {
      parameter: 'center',
      relevant: true,
      required: false,
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Center must be [longitude, latitude]' }
        }
        const [lon, lat] = value
        if (lon < -180 || lon > 180) {
          return { isValid: false, error: 'Longitude must be between -180 and 180' }
        }
        if (lat < -90 || lat > 90) {
          return { isValid: false, error: 'Latitude must be between -90 and 90' }
        }
        return { isValid: true }
      },
    },
    rotate: {
      parameter: 'rotate',
      relevant: true, // Fixed: rotate IS relevant for conic projections
      required: false,
      validate: (value) => {
        if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
          return { isValid: false, error: 'Rotation must be [longitude, latitude] or [longitude, latitude, gamma]' }
        }
        const [lon, lat] = value
        if (lon < -180 || lon > 180) {
          return { isValid: false, error: 'Longitude must be between -180 and 180' }
        }
        if (lat < -90 || lat > 90) {
          return { isValid: false, error: 'Latitude must be between -90 and 90' }
        }
        return { isValid: true }
      },
    },
    parallels: {
      parameter: 'parallels',
      relevant: true,
      required: false,
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Parallels must be [south, north]' }
        }
        const [south, north] = value
        if (south >= north) {
          return { isValid: false, error: 'South parallel must be less than north parallel' }
        }
        if (south < -90 || south > 90 || north < -90 || north > 90) {
          return { isValid: false, error: 'Parallels must be between -90 and 90 degrees' }
        }
        return { isValid: true }
      },
    },
    scale: {
      parameter: 'scale',
      relevant: true,
      min: 1,
      max: 100000,
      step: 1,
      required: false,
    },
    translate: {
      parameter: 'translate',
      relevant: true, // Added: translate IS relevant for conic projections
      required: false,
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Translate must be [x, y]' }
        }
        const [x, y] = value
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return { isValid: false, error: 'Translate values must be finite numbers' }
        }
        return { isValid: true }
      },
    },
    precision: {
      parameter: 'precision',
      relevant: true, // Added: precision IS relevant for conic projections
      required: false,
      min: 0.01,
      max: 10,
      step: 0.01,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: false, // Not relevant for conic projections
      required: false,
    },
  },

  AZIMUTHAL: {
    center: {
      parameter: 'center',
      relevant: false, // Uses rotation instead
      required: false,
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
      validate: (value) => {
        if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
          return { isValid: false, error: 'Rotation must be [longitude, latitude] or [longitude, latitude, gamma]' }
        }
        return { isValid: true }
      },
    },
    scale: {
      parameter: 'scale',
      relevant: true,
      min: 1,
      max: 100000,
      step: 1,
      required: false,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: true,
      min: 0,
      max: 180,
      step: 1,
      required: false,
    },
  },

  POLYHEDRAL: {
    center: {
      parameter: 'center',
      relevant: false,
      required: false,
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
    },
    scale: {
      parameter: 'scale',
      relevant: true,
      min: 1,
      max: 100000,
      step: 1,
      required: false,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
    },
  },

  COMPOSITE: {
    center: {
      parameter: 'center',
      relevant: false, // Composite projections manage their own parameters
      required: false,
    },
    rotate: {
      parameter: 'rotate',
      relevant: false,
      required: false,
    },
    scale: {
      parameter: 'scale',
      relevant: false,
      required: false,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
    },
  },

  OTHER: {
    center: {
      parameter: 'center',
      relevant: false,
      required: false,
    },
    rotate: {
      parameter: 'rotate',
      relevant: false,
      required: false,
    },
    scale: {
      parameter: 'scale',
      relevant: false,
      required: false,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
    },
  },
}

/**
 * Parameter validator service
 */
export class ParameterValidator {
  /**
   * Validate a single parameter value
   */
  static validateParameter(
    family: ProjectionFamilyType,
    key: keyof BaseProjectionParameters,
    value: any,
  ): ParameterValidationResult {
    const familyConstraints = PARAMETER_CONSTRAINTS[family]
    const parameterConstraints = familyConstraints?.[key]

    if (!parameterConstraints) {
      return {
        isValid: false,
        error: `No constraints defined for parameter ${key}`,
      }
    }

    // Check if parameter is relevant for this family
    if (!parameterConstraints.relevant) {
      return {
        isValid: false,
        error: `Parameter ${key} is not relevant for ${family} projections`,
        suggestion: this.getSuggestedAlternative(family, key),
      }
    }

    // Allow null/undefined values (parameter clearing)
    if (value === null || value === undefined) {
      return { isValid: true }
    }

    // Check custom validation function
    if (parameterConstraints.validate) {
      return parameterConstraints.validate(value, family)
    }

    // Basic numeric validation
    if (typeof value === 'number') {
      if (parameterConstraints.min !== undefined && value < parameterConstraints.min) {
        return {
          isValid: false,
          error: `${key} must be at least ${parameterConstraints.min}`,
        }
      }
      if (parameterConstraints.max !== undefined && value > parameterConstraints.max) {
        return {
          isValid: false,
          error: `${key} must be at most ${parameterConstraints.max}`,
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Validate a complete parameter set
   */
  static validateParameterSet(
    family: ProjectionFamilyType,
    parameters: BaseProjectionParameters,
  ): ParameterValidationResult[] {
    const results: ParameterValidationResult[] = []

    Object.entries(parameters).forEach(([key, value]) => {
      const paramKey = key as keyof BaseProjectionParameters
      const result = this.validateParameter(family, paramKey, value)

      if (!result.isValid || result.warning) {
        results.push(result)
      }
    })

    // Check for parameter dependencies
    const dependencyResults = this.validateParameterDependencies(family, parameters)
    results.push(...dependencyResults)

    return results
  }

  /**
   * Get parameter constraints for a projection family
   */
  static getParameterConstraints(family: ProjectionFamilyType): ProjectionFamilyConstraints {
    const familyConstraints = PARAMETER_CONSTRAINTS[family] || {}
    const constraints: Record<keyof BaseProjectionParameters, ParameterConstraints> = {} as any

    // Get parameter relevance from the existing system
    const relevantParams = getRelevantParameters(family)

    const parameterKeys: Array<keyof BaseProjectionParameters> = [
      'center',
      'rotate',
      'parallels',
      'scale',
      'translate',
      'clipAngle',
      'precision',
    ]

    parameterKeys.forEach((key) => {
      const customConstraints = familyConstraints[key]
      const isRelevant = relevantParams[key as keyof typeof relevantParams] || false

      constraints[key] = {
        parameter: key,
        relevant: customConstraints?.relevant ?? isRelevant,
        required: customConstraints?.required ?? false,
        min: customConstraints?.min,
        max: customConstraints?.max,
        step: customConstraints?.step,
        defaultValue: customConstraints?.defaultValue ?? this.getDefaultValue(key),
        validate: customConstraints?.validate,
      }
    })

    return {
      family,
      constraints,
    }
  }

  /**
   * Check if parameter is relevant for a projection family
   */
  static isParameterRelevant(family: ProjectionFamilyType, key: keyof BaseProjectionParameters): boolean {
    const constraints = this.getParameterConstraints(family)
    return constraints.constraints[key]?.relevant ?? false
  }

  /**
   * Get suggested alternative parameter for irrelevant parameters
   */
  private static getSuggestedAlternative(family: ProjectionFamilyType, key: keyof BaseProjectionParameters): any {
    // Suggest alternatives based on family and parameter
    if (family === 'CONIC' && key === 'rotate') {
      return 'Use center instead of rotate for conic projections'
    }
    if ((family === 'CYLINDRICAL' || family === 'AZIMUTHAL') && key === 'center') {
      return 'Use rotate instead of center for this projection family'
    }
    return undefined
  }

  /**
   * Validate parameter dependencies
   */
  private static validateParameterDependencies(
    family: ProjectionFamilyType,
    parameters: BaseProjectionParameters,
  ): ParameterValidationResult[] {
    const results: ParameterValidationResult[] = []

    // Check conic projection dependencies
    if (family === 'CONIC') {
      if (parameters.parallels) {
        const [south, north] = parameters.parallels
        if (Math.abs(south - north) < 1) {
          results.push({
            isValid: false,
            error: 'Conic parallels should be at least 1 degree apart for optimal results',
            warning: 'Very close parallels may cause visual distortion',
          })
        }
      }
    }

    // Check azimuthal projection dependencies
    if (family === 'AZIMUTHAL') {
      if (parameters.clipAngle && parameters.clipAngle > 90) {
        results.push({
          isValid: true,
          warning: 'Clip angles greater than 90° may cause unexpected results in azimuthal projections',
        })
      }
    }

    return results
  }

  /**
   * Get default value for a parameter
   */
  private static getDefaultValue(key: keyof BaseProjectionParameters): any {
    switch (key) {
      case 'center':
        return [0, 0]
      case 'rotate':
        return [0, 0, 0]
      case 'parallels':
        return [30, 60]
      case 'scale':
        return 1000
      case 'translate':
        return [0, 0]
      case 'clipAngle':
        return 90
      case 'precision':
        return 0.1
      default:
        return undefined
    }
  }
}
