import type {
  BulkResetOperation,
  PresetParameters,
  TerritoryResetOperation,
} from './types'
import type { TerritoryConfig } from '@/types'
import type { TerritoryCode } from '@/types/branded'
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

// The parameters of a territory that the preset leaves out: the fallback projection, centered on the center of the territory
export function defaultTerritoryParameters(center: [number, number]): ProjectionParameters {
  const family = projectionRegistry.get(FALLBACK_PROJECTION_ID)!.family
  return referenceParameters({ projectionId: FALLBACK_PROJECTION_ID, ...convertPositioning({ center }, family) })
}

export class TerritoryResetService {
  static calculateBulkReset(params: {
    territories: Pick<TerritoryConfig, 'code'>[]
    presetParameters?: PresetParameters
  }): BulkResetOperation {
    const { territories, presetParameters = {} } = params
    const presetCodes = Object.keys(presetParameters) as TerritoryCode[]
    const outsidePreset = territories.map(({ code }) => code).filter(code => !presetCodes.includes(code))

    return {
      operations: [
        ...presetCodes.map(territoryCode => ({ territoryCode, parameters: referenceParameters(presetParameters[territoryCode]) })),
        ...outsidePreset.map(territoryCode => ({ territoryCode, parameters: referenceParameters() })),
      ],
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
