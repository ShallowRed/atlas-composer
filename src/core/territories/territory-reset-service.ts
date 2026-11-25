import type {
  BulkResetOperation,
  PresetParameters,
  TerritoryResetOperation,
} from './types'
import type { TerritoryConfig } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { parameterRegistry } from '@/core/parameters'
import { convertPositioning } from '@/core/positioning'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { projectionRegistry } from '@/core/projections/registry'

export const RESET_KEYS = ['translateOffset', 'scaleMultiplier'] as const satisfies readonly (keyof ProjectionParameters)[]

export function referenceParameters(presetParameters?: Partial<ProjectionParameters>): ProjectionParameters {
  const [x, y] = parameterRegistry.getDefaultValue('translateOffset')
  return {
    translateOffset: [x, y],
    scaleMultiplier: parameterRegistry.getDefaultValue('scaleMultiplier'),
    ...presetParameters,
  }
}

// The parameters of a territory in a projection centered on its center, the fallback projection unless another is given
export function defaultTerritoryParameters(center: [number, number], projectionId: ProjectionId = FALLBACK_PROJECTION_ID): ProjectionParameters {
  const family = projectionRegistry.get(projectionId)!.family
  return referenceParameters({ projectionId, ...convertPositioning({ center }, family) })
}

export class TerritoryResetService {
  static calculateBulkReset(params: {
    territories: Pick<TerritoryConfig, 'code' | 'center'>[]
    presetParameters?: PresetParameters
  }): BulkResetOperation {
    const { territories, presetParameters = {} } = params
    const presetCodes = Object.keys(presetParameters) as TerritoryCode[]
    const centers = new Map(territories.map(({ code, center }) => [code, center]))
    const outsidePreset = territories.map(({ code }) => code).filter(code => !presetCodes.includes(code))

    return {
      operations: [...presetCodes, ...outsidePreset].map(territoryCode => TerritoryResetService.calculateTerritoryReset({
        territoryCode,
        presetParameters,
        territoryCenter: () => centers.get(territoryCode)!,
      })),
      activeTerritories: presetCodes.length > 0 ? presetCodes : undefined,
    }
  }

  static calculateTerritoryReset(params: {
    territoryCode: TerritoryCode
    presetParameters?: PresetParameters
    territoryCenter: () => [number, number]
  }): TerritoryResetOperation {
    const { territoryCode, presetParameters, territoryCenter } = params
    const presetValues = presetParameters?.[territoryCode]
    return {
      territoryCode,
      parameters: presetValues ? referenceParameters(presetValues) : defaultTerritoryParameters(territoryCenter()),
    }
  }
}
