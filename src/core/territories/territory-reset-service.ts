import type {
  BulkResetOperation,
  PresetParameters,
  ResetStrategy,
  TerritoryResetOperation,
} from './types'
import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryConfig } from '@/types'
import type { TerritoryCode } from '@/types/branded'

export class TerritoryResetService {
  static calculateBulkReset(params: {
    territories: Pick<TerritoryConfig, 'code'>[]
    presetDefaults?: TerritoryDefaults
    presetParameters?: PresetParameters
  }): BulkResetOperation {
    const { territories, presetDefaults, presetParameters } = params

    const strategy = this.determineResetStrategy(presetDefaults)

    if (strategy === 'preset' && presetDefaults) {
      return this.calculatePresetReset(territories, presetDefaults, presetParameters)
    }

    return this.calculateFallbackReset(territories)
  }

  static calculateTerritoryReset(params: {
    territoryCode: TerritoryCode
    presetDefaults?: TerritoryDefaults
    presetParameters?: PresetParameters
  }): TerritoryResetOperation {
    const { territoryCode, presetDefaults, presetParameters } = params

    const hasPresetForTerritory = presetDefaults?.projections[territoryCode] !== undefined

    if (hasPresetForTerritory && presetDefaults) {
      return {
        territoryCode,
        projection: presetDefaults.projections[territoryCode],
        translation: presetDefaults.translations[territoryCode] || { x: 0, y: 0 },
        scale: presetDefaults.scales[territoryCode] || 1.0,
        parameters: presetParameters?.[territoryCode],
        shouldClearOverrides: true,
      }
    }

    return {
      territoryCode,
      translation: { x: 0, y: 0 },
      scale: 1.0,
      shouldClearOverrides: true,
    }
  }

  private static determineResetStrategy(
    presetDefaults?: TerritoryDefaults,
  ): ResetStrategy {
    if (!presetDefaults || Object.keys(presetDefaults.projections).length === 0) {
      return 'fallback'
    }
    return 'preset'
  }

  private static calculatePresetReset(
    _territories: Pick<TerritoryConfig, 'code'>[],
    presetDefaults: TerritoryDefaults,
    presetParameters?: PresetParameters,
  ): BulkResetOperation {
    const presetTerritoryCodes = Object.keys(presetDefaults.projections) as TerritoryCode[]

    const operations: TerritoryResetOperation[] = presetTerritoryCodes.map((code) => {
      return {
        territoryCode: code,
        projection: presetDefaults.projections[code],
        translation: presetDefaults.translations[code] || { x: 0, y: 0 },
        scale: presetDefaults.scales[code] || 1.0,
        parameters: presetParameters?.[code],
        shouldClearOverrides: true,
      }
    })

    return {
      operations,
      activeTerritories: presetTerritoryCodes,
    }
  }

  private static calculateFallbackReset(
    territories: Pick<TerritoryConfig, 'code'>[],
  ): BulkResetOperation {
    const operations: TerritoryResetOperation[] = territories.map((territory) => {
      return {
        territoryCode: territory.code,
        translation: { x: 0, y: 0 },
        scale: 1.0,
        shouldClearOverrides: true,
      }
    })

    return {
      operations,
    }
  }
}
