/**
 * Parameter Validator Service
 *
 * Provides comprehensive validation for projection parameters including
 * compatibility checks, constraint validation, and dependency validation.
 *
 * @deprecated This class now delegates to UnifiedParameterConstraints.
 * Use UnifiedParameterConstraints directly for new code.
 */

import type { ProjectionFamilyType } from '@/core/projections/types'
import type {
  BaseProjectionParameters,
  ParameterValidationResult,
  ProjectionFamilyConstraints,
} from '@/types/projection-parameters'

import { UnifiedParameterConstraints } from './unified-parameter-constraints'

/**
 * Parameter validator service
 *
 * @deprecated This class delegates all operations to UnifiedParameterConstraints.
 * Use UnifiedParameterConstraints directly for new code.
 */
export class ParameterValidator {
  /**
   * Validate a single parameter value
   * @deprecated Use UnifiedParameterConstraints.validateParameter() instead
   */
  static validateParameter(
    family: ProjectionFamilyType,
    key: keyof BaseProjectionParameters,
    value: any,
  ): ParameterValidationResult {
    return UnifiedParameterConstraints.validateParameter(family, key, value)
  }

  /**
   * Validate a complete parameter set
   * @deprecated Use UnifiedParameterConstraints.validateParameterSet() instead
   */
  static validateParameterSet(
    family: ProjectionFamilyType,
    parameters: BaseProjectionParameters,
  ): ParameterValidationResult[] {
    return UnifiedParameterConstraints.validateParameterSet(family, parameters)
  }

  /**
   * Get parameter constraints for a projection family
   * @deprecated Use UnifiedParameterConstraints.getParameterConstraints() instead
   */
  static getParameterConstraints(family: ProjectionFamilyType): ProjectionFamilyConstraints {
    return UnifiedParameterConstraints.getParameterConstraints(family)
  }

  /**
   * Check if parameter is relevant for a projection family
   * @deprecated Use UnifiedParameterConstraints.isParameterRelevant() instead
   */
  static isParameterRelevant(family: ProjectionFamilyType, key: keyof BaseProjectionParameters): boolean {
    return UnifiedParameterConstraints.isParameterRelevant(family, key)
  }
}
