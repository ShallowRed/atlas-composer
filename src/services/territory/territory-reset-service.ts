import type {
  BulkResetOperation,
  PresetDefaults,
  PresetParameters,
  ResetStrategy,
  TerritoryConfig,
  TerritoryResetOperation,
} from './types'

export class TerritoryResetService {
  static calculateBulkReset(params: {
    territories: TerritoryConfig[]
    presetDefaults?: PresetDefaults
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
    territoryCode: string
    presetDefaults?: PresetDefaults
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
    presetDefaults?: PresetDefaults,
  ): ResetStrategy {
    if (!presetDefaults || Object.keys(presetDefaults.projections).length === 0) {
      return 'fallback'
    }
    return 'preset'
  }

  private static calculatePresetReset(
    _territories: TerritoryConfig[],
    presetDefaults: PresetDefaults,
    presetParameters?: PresetParameters,
  ): BulkResetOperation {
    const presetTerritoryCodes = Object.keys(presetDefaults.projections)

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
    territories: TerritoryConfig[],
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

  static getDefaultTranslation() {
    return { x: 0, y: 0 }
  }

  static getDefaultScale() {
    return 1.0
  }
}
