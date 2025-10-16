/**
 * Unified Projection Parameter Types
 *
 * Single consolidated interface for all projection parameter needs across the application.
 * Eliminates type inconsistencies between core projections, export/import, and atlas systems.
 */

import type { ProjectionFamilyType } from '@/core/projections/types'

/**
 * Unified projection parameters interface
 * Consolidates all parameter types into a single interface with optional metadata
 */
export interface ProjectionParameters {
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

  /** Territory position offset from map center [x, y] in pixels */
  translateOffset?: [number, number]

  /** Clipping angle for azimuthal projections (degrees) */
  clipAngle?: number

  /** Precision for adaptive sampling */
  precision?: number

  // Optional metadata fields (for backward compatibility and extended functionality)
  /** Projection family for parameter validation */
  family?: ProjectionFamilyType

  /** Projection ID from registry */
  projectionId?: string

  /** Base scale before user adjustments (used in export/import) */
  baseScale?: number

  /** User's scale multiplier (scale = baseScale * scaleMultiplier) */
  scaleMultiplier?: number

  // Index signature to allow dynamic property access (for parameter management)
  [key: string]: any
}

// Legacy interface removed - functionality merged into ProjectionParameters

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
  key: keyof ProjectionParameters
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
  parameter: keyof ProjectionParameters
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
  constraints: Record<keyof ProjectionParameters, ParameterConstraints>
}

/**
 * Parameter change event payload
 */
export interface ParameterChangeEvent {
  /** Parameter key that changed */
  key: keyof ProjectionParameters
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
export type ParameterUpdate = Partial<ProjectionParameters>

/**
 * Type guard to check if parameters have scale metadata (extended functionality)
 */
export function hasScaleMetadata(
  params: ProjectionParameters,
): params is ProjectionParameters & { baseScale: number, scaleMultiplier: number, scale: number } {
  return 'baseScale' in params && 'scaleMultiplier' in params && typeof params.scale === 'number'
}

/**
 * Type guard to check if parameters have metadata
 */
export function hasParameterMetadata(
  params: ProjectionParameters,
): params is ProjectionParameters & { family: ProjectionFamilyType, projectionId: string } {
  return 'family' in params || 'projectionId' in params
}

/**
 * Convert atlas parameters to unified parameters format
 */
export function  (atlasParams: AtlasProjectionParameters): ProjectionParameters {
  // Handle undefined or missing properties
  if (!atlasParams) {
    return {}
  }

  const result: ProjectionParameters = {}

  // Handle center - can be array [lon, lat] or object {longitude, latitude}
  if (atlasParams.center) {
    if (Array.isArray(atlasParams.center)) {
      result.center = atlasParams.center as unknown as [number, number]
    }
    else if (typeof atlasParams.center === 'object' && 'longitude' in atlasParams.center) {
      result.center = [atlasParams.center.longitude, atlasParams.center.latitude]
    }
  }

  // Handle rotate - can be array [x, y, z] or object {mainland: [x, y]}
  if (atlasParams.rotate) {
    if (Array.isArray(atlasParams.rotate)) {
      result.rotate = atlasParams.rotate as unknown as [number, number, number?]
    }
    else if (typeof atlasParams.rotate === 'object' && 'mainland' in atlasParams.rotate) {
      result.rotate = [atlasParams.rotate.mainland[0], atlasParams.rotate.mainland[1]]
    }
  }

  // Handle parallels - can be array [p1, p2] or object {conic: [p1, p2]}
  if (atlasParams.parallels) {
    if (Array.isArray(atlasParams.parallels)) {
      result.parallels = atlasParams.parallels as unknown as [number, number]
    }
    else if (typeof atlasParams.parallels === 'object' && 'conic' in atlasParams.parallels) {
      result.parallels = atlasParams.parallels.conic
    }
  }

  // Handle scale
  if (atlasParams.scale !== undefined) {
    result.scale = atlasParams.scale
  }

  return result
}

/**
 * Convert unified parameters to atlas parameters format
 */
export function projectionToAtlasParameters(
  params: ProjectionParameters,
  fallbackValues?: Partial<AtlasProjectionParameters>,
): AtlasProjectionParameters {
  const center = params.center || [0, 0]
  const rotate = params.rotate || [0, 0]
  const parallels = params.parallels || [30, 60]

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
    scale: params.scale,
    ...fallbackValues,
  }
}

/**
 * Merge parameter objects with precedence rules
 * Later parameters override earlier ones
 */
export function mergeParameters(
  ...parameterSets: (ProjectionParameters | undefined)[]
): ProjectionParameters {
  return parameterSets
    .filter((params): params is ProjectionParameters => params !== undefined)
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
    }, {} as ProjectionParameters)
}

/** @deprecated Use ProjectionParameters with optional metadata fields instead */
export type ExtendedProjectionParameters = ProjectionParameters & { baseScale: number, scaleMultiplier: number, scale: number }

/** @deprecated Use ProjectionParameters with optional metadata fields instead */
export type ProjectionParametersWithMetadata = ProjectionParameters & { family?: ProjectionFamilyType, projectionId?: string }

// Backward compatibility functions (deprecated)
/** @deprecated Use atlasToProjectionParameters instead */
export const atlasToBaseParameters = atlasToProjectionParameters

/** @deprecated Use projectionToAtlasParameters instead */
export const baseToAtlasParameters = projectionToAtlasParameters
