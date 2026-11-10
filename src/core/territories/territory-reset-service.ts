import type {
  BulkResetOperation,
  PresetParameters,
  ResetStrategy,
  TerritoryResetOperation,
} from './types'
import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryConfig } from '@/types'
import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { parameterRegistry } from '@/core/parameters'

function defaultTranslation() {
  const [x, y] = parameterRegistry.getDefaultValue('translateOffset')
  return { x, y }
}

export const RESET_KEYS = ['translateOffset', 'scaleMultiplier'] as const satisfies readonly (keyof ProjectionParameters)[]

export function referenceParameters(operation: TerritoryResetOperation): ProjectionParameters {
  const { projection, translation, scale, parameters } = operation
  return {
    ...(projection ? { projectionId: projection } : {}),
    translateOffset: [translation.x, translation.y],
    scaleMultiplier: scale,
    ...parameters,
  }
}

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
        translation: presetDefaults.translations[territoryCode] || defaultTranslation(),
        scale: presetDefaults.scales[territoryCode] || parameterRegistry.getDefaultValue('scaleMultiplier'),
        parameters: presetParameters?.[territoryCode],
        shouldClearOverrides: true,
      }
    }

    return {
      territoryCode,
      translation: defaultTranslation(),
      scale: parameterRegistry.getDefaultValue('scaleMultiplier'),
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
    territories: Pick<TerritoryConfig, 'code'>[],
    presetDefaults: TerritoryDefaults,
    presetParameters?: PresetParameters,
  ): BulkResetOperation {
    const presetTerritoryCodes = Object.keys(presetDefaults.projections) as TerritoryCode[]

    const presetOperations: TerritoryResetOperation[] = presetTerritoryCodes.map((code) => {
      return {
        territoryCode: code,
        projection: presetDefaults.projections[code],
        translation: presetDefaults.translations[code] || defaultTranslation(),
        scale: presetDefaults.scales[code] || parameterRegistry.getDefaultValue('scaleMultiplier'),
        parameters: presetParameters?.[code],
        shouldClearOverrides: true,
      }
    })
    const outsidePreset = territories.filter(({ code }) => !presetTerritoryCodes.includes(code))

    return {
      operations: [...presetOperations, ...this.calculateFallbackReset(outsidePreset).operations],
      activeTerritories: presetTerritoryCodes,
    }
  }

  private static calculateFallbackReset(
    territories: Pick<TerritoryConfig, 'code'>[],
  ): BulkResetOperation {
    const operations: TerritoryResetOperation[] = territories.map((territory) => {
      return {
        territoryCode: territory.code,
        translation: defaultTranslation(),
        scale: parameterRegistry.getDefaultValue('scaleMultiplier'),
        shouldClearOverrides: true,
      }
    })

    return {
      operations,
    }
  }
}
