import type { ProjectionFamilyType } from '@/core/projections/types'

export interface ProjectionParameters {
  focusLongitude?: number
  focusLatitude?: number
  rotateGamma?: number

  /** @deprecated Use focusLongitude/focusLatitude instead */
  center?: [number, number]
  /** @deprecated Use focusLongitude/focusLatitude instead */
  rotate?: [number, number, number?]

  parallels?: [number, number]
  clipAngle?: number
  precision?: number
  translateOffset?: [number, number]
  scaleMultiplier?: number
  pixelClipExtent?: [number, number, number, number]
  family?: ProjectionFamilyType
  projectionId?: string

  [key: string]: any
}

export type ParameterSource = 'default' | 'projection' | 'atlas' | 'global' | 'territory'

export interface ParameterInheritance {
  key: keyof ProjectionParameters
  value: any
  source: ParameterSource
  isOverridden: boolean
  defaultValue?: any
  atlasValue?: any
  globalValue?: any
}

export interface ParameterValidationResult {
  isValid: boolean
  error?: string
  warning?: string
  suggestion?: any
}

export interface ParameterConstraints {
  parameter: keyof ProjectionParameters
  min?: number
  max?: number
  step?: number
  required?: boolean
  relevant: boolean
  defaultValue?: any
  validate?: (value: any, family: ProjectionFamilyType) => ParameterValidationResult
}

export interface ProjectionFamilyConstraints {
  family: ProjectionFamilyType
  constraints: Record<keyof ProjectionParameters, ParameterConstraints>
}

export interface ParameterChangeEvent {
  key: keyof ProjectionParameters
  value: any
  previousValue?: any
  territoryCode?: string
  source: ParameterSource
}

export type ParameterUpdate = Partial<ProjectionParameters>

export function hasScaleMetadata(
  params: ProjectionParameters,
): params is ProjectionParameters & { baseScale: number, scaleMultiplier: number, scale: number } {
  return 'baseScale' in params && 'scaleMultiplier' in params && typeof params.scale === 'number'
}

export function hasParameterMetadata(
  params: ProjectionParameters,
): params is ProjectionParameters & { family: ProjectionFamilyType, projectionId: string } {
  return 'family' in params || 'projectionId' in params
}

export function mergeParameters(
  ...parameterSets: (ProjectionParameters | undefined)[]
): ProjectionParameters {
  return parameterSets
    .filter((params): params is ProjectionParameters => params !== undefined)
    .reduce((merged, params) => {
      return {
        ...merged,
        ...params,
        center: params.center ? [...params.center] as [number, number] : merged.center,
        rotate: params.rotate ? [...params.rotate] as [number, number, number?] : merged.rotate,
        parallels: params.parallels ? [...params.parallels] as [number, number] : merged.parallels,
        translateOffset: params.translateOffset ? [...params.translateOffset] as [number, number] : merged.translateOffset,
        pixelClipExtent: params.pixelClipExtent ? [...params.pixelClipExtent] as [number, number, number, number] : merged.pixelClipExtent,
      }
    }, {} as ProjectionParameters)
}
