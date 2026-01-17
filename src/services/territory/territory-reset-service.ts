import type {
  BulkResetOperation,
  PresetDefaults,
  PresetParameters,
  ResetStrategy,
  TerritoryConfig,
  TerritoryResetOperation,
} from './types'

/**
 * Territory Reset Service
 *
 * Domain service for territory reset business logic.
 * Pure functions that calculate what operations should be performed.
 * Separation of concerns: this service calculates, caller executes.
 *
 * Responsibilities:
 * - Calculate reset operations for territories
 * - Determine reset strategy (preset vs fallback)
 * - Build operation lists with correct defaults
 *
 * Business Rules:
 * - Preset defaults take precedence when available
 * - Fallback to hardcoded defaults (scale: 1.0, translation: 0,0) when no preset
 * - All parameter overrides should be cleared before reset
 * - Active territory set should match preset territories when resetting all
 */
export class TerritoryResetService {
  /**
   * Calculate reset operations for all territories
   *
   * @param params - Reset parameters
   * @returns Bulk reset operation with all territory operations
   */
  static calculateBulkReset(params: {
    territories: TerritoryConfig[]
    presetDefaults?: PresetDefaults
    presetParameters?: PresetParameters
  }): BulkResetOperation {
    const { territories, presetDefaults, presetParameters } = params

    // Determine strategy
    const strategy = this.determineResetStrategy(presetDefaults)

    if (strategy === 'preset' && presetDefaults) {
      return this.calculatePresetReset(territories, presetDefaults, presetParameters)
    }

    return this.calculateFallbackReset(territories)
  }

  /**
   * Calculate reset operation for a single territory
   *
   * @param params - Single territory reset parameters
   * @returns Reset operation for the territory
   */
  static calculateTerritoryReset(params: {
    territoryCode: string
    presetDefaults?: PresetDefaults
    presetParameters?: PresetParameters
  }): TerritoryResetOperation {
    const { territoryCode, presetDefaults, presetParameters } = params

    // Check if preset has this territory
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

    // Fallback defaults
    return {
      territoryCode,
      translation: { x: 0, y: 0 },
      scale: 1.0,
      shouldClearOverrides: true,
    }
  }

  /**
   * Determine which reset strategy to use
   */
  private static determineResetStrategy(
    presetDefaults?: PresetDefaults,
  ): ResetStrategy {
    if (!presetDefaults || Object.keys(presetDefaults.projections).length === 0) {
      return 'fallback'
    }
    return 'preset'
  }

  /**
   * Calculate preset-based reset (when preset defaults are available)
   */
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

  /**
   * Calculate fallback reset (when no preset available)
   */
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
      // Don't change active territories in fallback mode
    }
  }

  /**
   */
  static getDefaultTranslation() {
    return { x: 0, y: 0 }
  }

  /**
   */
  static getDefaultScale() {
    return 1.0
  }
}
