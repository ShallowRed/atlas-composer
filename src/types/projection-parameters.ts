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

  /** Translation offset [x, y] in pixels */
  translate?: [number, number]

  /** Territory position offset from map center [x, y] in pixels */
  translateOffset?: [number, number]

  /** Clipping angle for azimuthal projections (degrees) */
  clipAngle?: number

  /** Precision for adaptive sampling */
  precision?: number

  // Optional metadata fields for extended functionality
  /** Projection family for parameter validation */
  family?: ProjectionFamilyType

  /** Projection ID from registry */
  projectionId?: string

  /** User's scale multiplier applied to atlas referenceScale */
  scaleMultiplier?: number

  /** ClipExtent scale multiplier (1.0 = default preset size) */
  clipExtentScale?: number

  /** ClipExtent X offset in normalized coordinates */
  clipExtentOffsetX?: number

  /** ClipExtent Y offset in normalized coordinates */
  clipExtentOffsetY?: number

  /** ClipExtent bounds override - x1 (left) in normalized coordinates */
  clipExtentX1?: number

  /** ClipExtent bounds override - y1 (top) in normalized coordinates */
  clipExtentY1?: number

  /** ClipExtent bounds override - x2 (right) in normalized coordinates */
  clipExtentX2?: number

  /** ClipExtent bounds override - y2 (bottom) in normalized coordinates */
  clipExtentY2?: number

  // Index signature to allow dynamic property access (for parameter management)
  [key: string]: any
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
