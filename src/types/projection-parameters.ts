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
  // ==========================================================================
  // CANONICAL POSITIONING (Primary - projection-agnostic)
  // ==========================================================================
  // These are the preferred positioning parameters. They represent the geographic
  // focus point and are converted to center() or rotate() based on projection family.

  /** Longitude of the geographic focus point (-180 to 180) */
  focusLongitude?: number

  /** Latitude of the geographic focus point (-90 to 90) */
  focusLatitude?: number

  /** Third rotation axis for 3-axis rotation (-180 to 180) */
  rotateGamma?: number

  // ==========================================================================
  // LEGACY POSITIONING (Deprecated - for backward compatibility)
  // ==========================================================================
  // These are kept for backward compatibility. New code should use
  // focusLongitude/focusLatitude. During loading, these are converted to canonical.

  /** @deprecated Use focusLongitude/focusLatitude instead. Geographic center [longitude, latitude] */
  center?: [number, number]

  /** @deprecated Use focusLongitude/focusLatitude instead. Rotation [lambda, phi, gamma] */
  rotate?: [number, number, number?]

  // ==========================================================================
  // PROJECTION-SPECIFIC PARAMETERS
  // ==========================================================================

  /** Standard parallels for conic projections [south, north] */
  parallels?: [number, number]

  /** Clipping angle for azimuthal projections (degrees) */
  clipAngle?: number

  /** Precision for adaptive sampling */
  precision?: number

  // ==========================================================================
  // LAYOUT PARAMETERS
  // ==========================================================================

  /** Territory position offset from map center [x, y] in pixels */
  translateOffset?: [number, number]

  /** User's scale multiplier applied to atlas referenceScale */
  scaleMultiplier?: number

  /** Pixel-based clipExtent override relative to translateOffset [x1, y1, x2, y2] */
  pixelClipExtent?: [number, number, number, number]

  // ==========================================================================
  // METADATA
  // ==========================================================================

  /** Projection family for parameter validation */
  family?: ProjectionFamilyType

  /** Projection ID from registry */
  projectionId?: string

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
        translateOffset: params.translateOffset ? [...params.translateOffset] as [number, number] : merged.translateOffset,
        pixelClipExtent: params.pixelClipExtent ? [...params.pixelClipExtent] as [number, number, number, number] : merged.pixelClipExtent,
      }
    }, {} as ProjectionParameters)
}
