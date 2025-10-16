/**
 * Unified Parameter Constraints System
 *
 * Single source of truth for all projection parameter constraints, validation rules,
 * and relevance definitions. Consolidates the previous dual system architecture.
 */

import type { ProjectionFamilyType } from '@/core/projections/types'
import type {
  ParameterConstraints,
  ParameterValidationResult,
  ProjectionFamilyConstraints,
  ProjectionParameters,
} from '@/types/projection-parameters'

/**
 * Comprehensive parameter constraint definition
 */
interface ParameterConstraint extends ParameterConstraints {
  /** Default value for the parameter */
  defaultValue?: unknown
  /** Custom validation function */
  validate?: (value: any, family?: ProjectionFamilyType) => ParameterValidationResult
}

/**
 * Complete parameter constraints by projection family
 *
 * This is the single source of truth for all parameter relevance,
 * constraints, defaults, and validation logic.
 */
const UNIFIED_PARAMETER_CONSTRAINTS: Record<ProjectionFamilyType, Partial<Record<keyof ProjectionParameters, ParameterConstraint>>> = {
  CYLINDRICAL: {
    center: {
      parameter: 'center',
      relevant: false, // Uses rotation instead
      required: false,
      defaultValue: [0, 0],
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
      defaultValue: [0, 0, 0],
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
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 1000,
    },
    translate: {
      parameter: 'translate',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Translate must be [x, y]' }
        }
        return { isValid: true }
      },
    },
    precision: {
      parameter: 'precision',
      relevant: true,
      required: false,
      min: 0.01,
      max: 10,
      step: 0.01,
      defaultValue: 0.1,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: false,
      required: false,
      defaultValue: 90,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false, // Not used in cylindrical projections
      required: false,
      defaultValue: [30, 60],
    },
    baseScale: {
      parameter: 'baseScale',
      relevant: true, // Used internally for composite projections
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 2700,
    },
    scaleMultiplier: {
      parameter: 'scaleMultiplier',
      relevant: true, // Used for user scale adjustments
      required: false,
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1.0,
    },
    translateOffset: {
      parameter: 'translateOffset',
      relevant: true, // Used for territory positioning in composite projections
      required: false,
      defaultValue: [0, 0],
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Translate offset must be [x, y]' }
        }
        const [x, y] = value
        if (x < -2000 || x > 2000 || y < -2000 || y > 2000) {
          return { isValid: false, error: 'Translate offset values must be between -2000 and 2000' }
        }
        return { isValid: true }
      },
    },
  },

  PSEUDOCYLINDRICAL: {
    center: {
      parameter: 'center',
      relevant: false, // Uses rotation instead
      required: false,
      defaultValue: [0, 0],
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
      defaultValue: [0, 0, 0],
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
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 1000,
    },
    translate: {
      parameter: 'translate',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    precision: {
      parameter: 'precision',
      relevant: true,
      required: false,
      min: 0.01,
      max: 10,
      step: 0.01,
      defaultValue: 0.1,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: false,
      required: false,
      defaultValue: 90,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
      defaultValue: [30, 60],
    },
    baseScale: {
      parameter: 'baseScale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 2700,
    },
    scaleMultiplier: {
      parameter: 'scaleMultiplier',
      relevant: true,
      required: false,
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1.0,
    },
  },

  CONIC: {
    center: {
      parameter: 'center',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
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
      relevant: true,
      required: false,
      defaultValue: [0, 0, 0],
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
      defaultValue: [30, 60],
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
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 1000,
    },
    translate: {
      parameter: 'translate',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    precision: {
      parameter: 'precision',
      relevant: true,
      required: false,
      min: 0.01,
      max: 10,
      step: 0.01,
      defaultValue: 0.1,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: false,
      required: false,
      defaultValue: 90,
    },
    baseScale: {
      parameter: 'baseScale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 2700,
    },
    scaleMultiplier: {
      parameter: 'scaleMultiplier',
      relevant: true,
      required: false,
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1.0,
    },
    translateOffset: {
      parameter: 'translateOffset',
      relevant: true, // Used for territory positioning in composite projections
      required: false,
      defaultValue: [0, 0],
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Translate offset must be [x, y]' }
        }
        const [x, y] = value
        if (x < -2000 || x > 2000 || y < -2000 || y > 2000) {
          return { isValid: false, error: 'Translate offset values must be between -2000 and 2000' }
        }
        return { isValid: true }
      },
    },
  },

  AZIMUTHAL: {
    center: {
      parameter: 'center',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
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
      relevant: true,
      required: false,
      defaultValue: [0, 0, 0],
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
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 1000,
    },
    translate: {
      parameter: 'translate',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    precision: {
      parameter: 'precision',
      relevant: true,
      required: false,
      min: 0.01,
      max: 10,
      step: 0.01,
      defaultValue: 0.1,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: true,
      required: false,
      min: 0,
      max: 180,
      step: 1,
      defaultValue: 90,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
      defaultValue: [30, 60],
    },
    baseScale: {
      parameter: 'baseScale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 2700,
    },
    scaleMultiplier: {
      parameter: 'scaleMultiplier',
      relevant: true,
      required: false,
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1.0,
    },
    translateOffset: {
      parameter: 'translateOffset',
      relevant: true, // Used for territory positioning in composite projections
      required: false,
      defaultValue: [0, 0],
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Translate offset must be [x, y]' }
        }
        const [x, y] = value
        if (x < -2000 || x > 2000 || y < -2000 || y > 2000) {
          return { isValid: false, error: 'Translate offset values must be between -2000 and 2000' }
        }
        return { isValid: true }
      },
    },
  },

  POLYHEDRAL: {
    center: {
      parameter: 'center',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
      defaultValue: [0, 0, 0],
    },
    scale: {
      parameter: 'scale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 1000,
    },
    translate: {
      parameter: 'translate',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    precision: {
      parameter: 'precision',
      relevant: true,
      required: false,
      min: 0.01,
      max: 10,
      step: 0.01,
      defaultValue: 0.1,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: false,
      required: false,
      defaultValue: 90,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
      defaultValue: [30, 60],
    },
    baseScale: {
      parameter: 'baseScale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 2700,
    },
    scaleMultiplier: {
      parameter: 'scaleMultiplier',
      relevant: true,
      required: false,
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1.0,
    },
    translateOffset: {
      parameter: 'translateOffset',
      relevant: true, // Used for territory positioning in composite projections
      required: false,
      defaultValue: [0, 0],
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Translate offset must be [x, y]' }
        }
        const [x, y] = value
        if (x < -2000 || x > 2000 || y < -2000 || y > 2000) {
          return { isValid: false, error: 'Translate offset values must be between -2000 and 2000' }
        }
        return { isValid: true }
      },
    },
  },

  COMPOSITE: {
    center: {
      parameter: 'center',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
      defaultValue: [0, 0, 0],
    },
    scale: {
      parameter: 'scale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 1000,
    },
    translate: {
      parameter: 'translate',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    precision: {
      parameter: 'precision',
      relevant: true,
      required: false,
      min: 0.01,
      max: 10,
      step: 0.01,
      defaultValue: 0.1,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: false,
      required: false,
      defaultValue: 90,
    },
    parallels: {
      parameter: 'parallels',
      relevant: false,
      required: false,
      defaultValue: [30, 60],
    },
    baseScale: {
      parameter: 'baseScale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 2700,
    },
    scaleMultiplier: {
      parameter: 'scaleMultiplier',
      relevant: true,
      required: false,
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1.0,
    },
    translateOffset: {
      parameter: 'translateOffset',
      relevant: true, // Used for territory positioning in composite projections
      required: false,
      defaultValue: [0, 0],
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Translate offset must be [x, y]' }
        }
        const [x, y] = value
        if (x < -2000 || x > 2000 || y < -2000 || y > 2000) {
          return { isValid: false, error: 'Translate offset values must be between -2000 and 2000' }
        }
        return { isValid: true }
      },
    },
  },

  OTHER: {
    center: {
      parameter: 'center',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    rotate: {
      parameter: 'rotate',
      relevant: true,
      required: false,
      defaultValue: [0, 0, 0],
    },
    scale: {
      parameter: 'scale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 1000,
    },
    translate: {
      parameter: 'translate',
      relevant: true,
      required: false,
      defaultValue: [0, 0],
    },
    precision: {
      parameter: 'precision',
      relevant: true,
      required: false,
      min: 0.01,
      max: 10,
      step: 0.01,
      defaultValue: 0.1,
    },
    clipAngle: {
      parameter: 'clipAngle',
      relevant: true,
      required: false,
      min: 0,
      max: 180,
      step: 1,
      defaultValue: 90,
    },
    parallels: {
      parameter: 'parallels',
      relevant: true,
      required: false,
      defaultValue: [30, 60],
    },
    baseScale: {
      parameter: 'baseScale',
      relevant: true,
      required: false,
      min: 1,
      max: 100000,
      step: 1,
      defaultValue: 2700,
    },
    scaleMultiplier: {
      parameter: 'scaleMultiplier',
      relevant: true,
      required: false,
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1.0,
    },
    translateOffset: {
      parameter: 'translateOffset',
      relevant: true, // Used for territory positioning in composite projections
      required: false,
      defaultValue: [0, 0],
      validate: (value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          return { isValid: false, error: 'Translate offset must be [x, y]' }
        }
        const [x, y] = value
        if (x < -2000 || x > 2000 || y < -2000 || y > 2000) {
          return { isValid: false, error: 'Translate offset values must be between -2000 and 2000' }
        }
        return { isValid: true }
      },
    },
  },
}

/**
 * Standard parameter keys for all projection families
 */
const PARAMETER_KEYS: Array<keyof ProjectionParameters> = [
  'center',
  'rotate',
  'parallels',
  'scale',
  'translate',
  'clipAngle',
  'precision',
  'baseScale',
  'scaleMultiplier',
  'translateOffset',
]

/**
 * Unified Parameter Constraints API
 *
 * Single source of truth for all parameter constraint operations.
 */
export class UnifiedParameterConstraints {
  /**
   * Get complete constraint information for a projection family
   */
  static getParameterConstraints(family: ProjectionFamilyType): ProjectionFamilyConstraints {
    const familyConstraints = UNIFIED_PARAMETER_CONSTRAINTS[family] || UNIFIED_PARAMETER_CONSTRAINTS.OTHER
    const constraints: Record<keyof ProjectionParameters, ParameterConstraints> = {} as any

    PARAMETER_KEYS.forEach((key) => {
      const constraint = familyConstraints[key]
      constraints[key] = {
        parameter: key,
        relevant: constraint?.relevant ?? true,
        required: constraint?.required ?? false,
        min: constraint?.min,
        max: constraint?.max,
        step: constraint?.step,
        defaultValue: constraint?.defaultValue ?? this.getDefaultValue(key),
        validate: constraint?.validate,
      }
    })

    return {
      family,
      constraints,
    }
  }

  /**
   * Check if a parameter is relevant for a projection family
   */
  static isParameterRelevant(family: ProjectionFamilyType, key: keyof ProjectionParameters): boolean {
    const familyConstraints = UNIFIED_PARAMETER_CONSTRAINTS[family] || UNIFIED_PARAMETER_CONSTRAINTS.OTHER
    const constraint = familyConstraints[key]
    return constraint?.relevant ?? true
  }

  /**
   * Get default value for a parameter
   */
  static getParameterDefault(family: ProjectionFamilyType, key: keyof ProjectionParameters): unknown {
    const familyConstraints = UNIFIED_PARAMETER_CONSTRAINTS[family] || UNIFIED_PARAMETER_CONSTRAINTS.OTHER
    const constraint = familyConstraints[key]
    return constraint?.defaultValue ?? this.getDefaultValue(key)
  }

  /**
   * Validate a single parameter value
   */
  static validateParameter(
    family: ProjectionFamilyType,
    key: keyof ProjectionParameters,
    value: any,
  ): ParameterValidationResult {
    const familyConstraints = UNIFIED_PARAMETER_CONSTRAINTS[family] || UNIFIED_PARAMETER_CONSTRAINTS.OTHER
    const constraint = familyConstraints[key]

    if (!constraint) {
      return {
        isValid: false,
        error: `No constraints defined for parameter ${key}`,
      }
    }

    // Check if parameter is relevant for this family
    if (!constraint.relevant) {
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
    if (constraint.validate) {
      return constraint.validate(value, family)
    }

    // Basic numeric validation
    if (typeof value === 'number') {
      if (constraint.min !== undefined && value < constraint.min) {
        return {
          isValid: false,
          error: `${key} must be at least ${constraint.min}`,
        }
      }
      if (constraint.max !== undefined && value > constraint.max) {
        return {
          isValid: false,
          error: `${key} must be at most ${constraint.max}`,
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Validate a complete parameter set
   * Only validates relevant parameters for the given projection family
   */
  static validateParameterSet(
    family: ProjectionFamilyType,
    parameters: ProjectionParameters,
  ): ParameterValidationResult[] {
    const results: ParameterValidationResult[] = []

    Object.entries(parameters).forEach(([key, value]) => {
      const paramKey = key as keyof ProjectionParameters

      // Skip validation for irrelevant parameters (inherited from atlas/global defaults)
      // Only validate parameters that are actually relevant for this projection family
      if (!this.isParameterRelevant(family, paramKey)) {
        return // Skip this parameter
      }

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
   * Get fallback default value for a parameter
   */
  private static getDefaultValue(key: keyof ProjectionParameters): any {
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

  /**
   * Get suggested alternative parameter for irrelevant parameters
   */
  private static getSuggestedAlternative(family: ProjectionFamilyType, key: keyof ProjectionParameters): any {
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
    parameters: ProjectionParameters,
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
}
