/**
 * Unified Projection Parameter Types
 *
 * Consolidates parameter interfaces across the application to eliminate
 * type inconsistencies between core projections, export/import, and atlas systems.
 */

import type { ProjectionFamilyType } from '@/core/projections/types'

/**
 * Base projection parameters interface
 * Common parameters used across all projection types
 */
export interface BaseProjectionParameters {
  /** Geographic center point [longitude, latitude] */
  center?: [number, number]

  /** Rotation angles [lambda, phi, gamma] - gamma is optional */
  rotate?: [number, number, number?]

  /** Standard parallels for conic projections [south, north] */
  parallels?: [number, number]

  /** Current scale value */
  scale?: number

  /** Translation offset [x, y] in pixels */
  translate?: [number, number]

  /** Clipping angle for azimuthal projections (degrees) */
  clipAngle?: number

  /** Precision for adaptive sampling */
  precision?: number
}

/**
 * Extended projection parameters with scale metadata
 * Used for export/import and composite projection management
 */
export interface ExtendedProjectionParameters extends BaseProjectionParameters {
  /** Base scale before user adjustments (required for export/import) */
  baseScale: number

  /** User's scale multiplier (scale = baseScale * scaleMultiplier) */
  scaleMultiplier: number

  /** Current scale value (required for consistency) */
  scale: number
}

/**
 * Projection parameters with metadata
 * Used for territory-specific parameter management
 */
export interface ProjectionParametersWithMetadata extends BaseProjectionParameters {
  /** Projection family for parameter validation */
  family?: ProjectionFamilyType

  /** Projection ID from registry */
  projectionId?: string

  /** Base scale (optional for compatibility) */
  baseScale?: number

  /** Scale multiplier (optional for compatibility) */
  scaleMultiplier?: number
}

/**
 * Atlas-specific projection parameters
 * Structured format for regional defaults and atlas configuration
 */
export interface AtlasProjectionParameters {
  /** Geographic center configuration */
  center: {
    longitude: number
    latitude: number
  }

  /** Rotation configuration by projection type */
  rotate: {
    /** Rotation for mainland/conic projections [lambda, phi] */
    mainland: [number, number]
    /** Rotation for azimuthal projections [lambda, phi] */
    azimuthal: [number, number]
  }

  /** Standard parallels for conic projections */
  parallels: {
    /** Conic projection parallels [south, north] */
    conic: [number, number]
  }

  /** Optional custom scale for manual mode */
  scale?: number
}

/**
 * Parameter source types for inheritance tracking
 */
export type ParameterSource = 'default' | 'projection' | 'atlas' | 'global' | 'territory'

/**
 * Parameter inheritance information
 */
export interface ParameterInheritance {
  /** Parameter key */
  key: keyof BaseProjectionParameters
  /** Current value */
  value: any
  /** Source of the parameter value */
  source: ParameterSource
  /** Whether the parameter is overridden at territory level */
  isOverridden: boolean
  /** Default value from projection definition */
  defaultValue?: any
  /** Atlas-specific default value */
  atlasValue?: any
  /** Global override value */
  globalValue?: any
}

/**
 * Parameter validation result
 */
export interface ParameterValidationResult {
  /** Whether the parameter value is valid */
  isValid: boolean
  /** Validation error message (if invalid) */
  error?: string
  /** Warning message (if valid but not recommended) */
  warning?: string
  /** Suggested value (if current value has issues) */
  suggestion?: any
}

/**
 * Parameter constraints for a specific projection family
 */
export interface ParameterConstraints {
  /** Parameter key */
  parameter: keyof BaseProjectionParameters
  /** Minimum allowed value */
  min?: number
  /** Maximum allowed value */
  max?: number
  /** Step/increment for the parameter */
  step?: number
  /** Whether the parameter is required */
  required?: boolean
  /** Whether the parameter is relevant for this family */
  relevant: boolean
  /** Default value for this family */
  defaultValue?: any
  /** Additional validation rules */
  validate?: (value: any, family: ProjectionFamilyType) => ParameterValidationResult
}

/**
 * Complete parameter constraints for a projection family
 */
export interface ProjectionFamilyConstraints {
  /** Projection family */
  family: ProjectionFamilyType
  /** Constraints for each parameter */
  constraints: Record<keyof BaseProjectionParameters, ParameterConstraints>
}

/**
 * Parameter change event payload
 */
export interface ParameterChangeEvent {
  /** Parameter key that changed */
  key: keyof BaseProjectionParameters
  /** New parameter value */
  value: any
  /** Previous parameter value */
  previousValue?: any
  /** Territory code (if territory-specific change) */
  territoryCode?: string
  /** Source of the change */
  source: ParameterSource
}

/**
 * Utility type for parameter update operations
 */
export type ParameterUpdate = Partial<BaseProjectionParameters>

/**
 * Type guard to check if parameters are extended (have scale metadata)
 */
export function isExtendedParameters(
  params: BaseProjectionParameters,
): params is ExtendedProjectionParameters {
  return 'baseScale' in params && 'scaleMultiplier' in params && typeof params.scale === 'number'
}

/**
 * Type guard to check if parameters have metadata
 */
export function hasParameterMetadata(
  params: BaseProjectionParameters,
): params is ProjectionParametersWithMetadata {
  return 'family' in params || 'projectionId' in params
}

/**
 * Convert atlas parameters to base parameters format
 */
export function atlasToBaseParameters(atlasParams: AtlasProjectionParameters): BaseProjectionParameters {
  return {
    center: [atlasParams.center.longitude, atlasParams.center.latitude],
    rotate: [atlasParams.rotate.mainland[0], atlasParams.rotate.mainland[1]],
    parallels: atlasParams.parallels.conic,
    scale: atlasParams.scale,
  }
}

/**
 * Convert base parameters to atlas parameters format
 */
export function baseToAtlasParameters(
  baseParams: BaseProjectionParameters,
  fallbackValues?: Partial<AtlasProjectionParameters>,
): AtlasProjectionParameters {
  const center = baseParams.center || [0, 0]
  const rotate = baseParams.rotate || [0, 0]
  const parallels = baseParams.parallels || [30, 60]

  return {
    center: {
      longitude: center[0],
      latitude: center[1],
    },
    rotate: {
      mainland: [rotate[0], rotate[1]],
      azimuthal: [rotate[0], rotate[1]],
      ...fallbackValues?.rotate,
    },
    parallels: {
      conic: parallels,
      ...fallbackValues?.parallels,
    },
    scale: baseParams.scale,
    ...fallbackValues,
  }
}

/**
 * Merge parameter objects with precedence rules
 * Later parameters override earlier ones
 */
export function mergeParameters(
  ...parameterSets: (BaseProjectionParameters | undefined)[]
): BaseProjectionParameters {
  return parameterSets
    .filter((params): params is BaseProjectionParameters => params !== undefined)
    .reduce((merged, params) => {
      return {
        ...merged,
        ...params,
        // Handle array parameters specially to avoid reference issues
        center: params.center ? [...params.center] as [number, number] : merged.center,
        rotate: params.rotate ? [...params.rotate] as [number, number, number?] : merged.rotate,
        parallels: params.parallels ? [...params.parallels] as [number, number] : merged.parallels,
        translate: params.translate ? [...params.translate] as [number, number] : merged.translate,
      }
    }, {} as BaseProjectionParameters)
}
