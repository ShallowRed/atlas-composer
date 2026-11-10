import type {
  BulkResetOperation,
  PresetParameters,
  TerritoryResetOperation,
} from './types'
import type { TerritoryConfig } from '@/types'
import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { parameterRegistry } from '@/core/parameters'

export const RESET_KEYS = ['translateOffset', 'scaleMultiplier'] as const satisfies readonly (keyof ProjectionParameters)[]

export function referenceParameters(presetParameters?: Partial<ProjectionParameters>): ProjectionParameters {
  const [x, y] = parameterRegistry.getDefaultValue('translateOffset')
  return {
    translateOffset: [x, y],
    scaleMultiplier: parameterRegistry.getDefaultValue('scaleMultiplier'),
    ...presetParameters,
  }
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
      operations: [...presetCodes, ...outsidePreset]
        .map(territoryCode => this.calculateTerritoryReset({ territoryCode, presetParameters })),
      activeTerritories: presetCodes.length > 0 ? presetCodes : undefined,
    }
  }

  static calculateTerritoryReset(params: {
    territoryCode: TerritoryCode
    presetParameters?: PresetParameters
  }): TerritoryResetOperation {
    const { territoryCode, presetParameters } = params
    return { territoryCode, parameters: referenceParameters(presetParameters?.[territoryCode]) }
  }
}
