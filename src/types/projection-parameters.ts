import type { ProjectionFamilyType } from '@/core/projections/types'
import type { TerritoryCode } from '@/types/branded'

export interface ProjectionParameters {
  center?: [number, number]
  rotate?: [number, number] | [number, number, number]

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

export interface ProjectionParameterProvider {
  getEffectiveParameters: (territoryCode: TerritoryCode) => ProjectionParameters
  getExportableParameters: (territoryCode: TerritoryCode) => ProjectionParameters
}

export interface ParameterValidationResult {
  isValid: boolean
  error?: string
  warning?: string
  suggestion?: any
}

export type ParameterUpdate = Partial<ProjectionParameters>

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
        rotate: params.rotate ? [...params.rotate] as [number, number] | [number, number, number] : merged.rotate,
        parallels: params.parallels ? [...params.parallels] as [number, number] : merged.parallels,
        translateOffset: params.translateOffset ? [...params.translateOffset] as [number, number] : merged.translateOffset,
        pixelClipExtent: params.pixelClipExtent ? [...params.pixelClipExtent] as [number, number, number, number] : merged.pixelClipExtent,
      }
    }, {} as ProjectionParameters)
}
