import type {
  CompositeCustomConfig,
  CompositeExistingViewConfig,
  Preset,
  SplitViewConfig,
  UnifiedViewConfig,
} from '@/core/presets'

import type { ProjectionId, TerritoryCode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { logger } from '@/utils/logger'

const debug = logger.presets.manager

export interface ApplicationResult {
  success: boolean
  errors: string[]
  warnings: string[]
}

export class PresetApplicationService {
  static applyPreset(preset: Preset): ApplicationResult {
    try {
      switch (preset.type) {
        case 'composite-custom':
          return this.applyCompositeCustom(preset.config as CompositeCustomConfig)
        case 'unified':
          return this.applyUnified(preset.config as UnifiedViewConfig)
        case 'split':
          return this.applySplit(preset.config as SplitViewConfig)
        case 'built-in-composite':
          return this.applyCompositeExisting(preset.config as CompositeExistingViewConfig)
        default:
          return {
            success: false,
            errors: [`Unknown preset type: ${(preset as any).type}`],
            warnings: [],
          }
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      }
    }
  }

  private static applyCompositeCustom(_config: CompositeCustomConfig): ApplicationResult {
    return {
      success: false,
      errors: ['Composite-custom presets should be loaded through atlas initialization, not view preset API'],
      warnings: [],
    }
  }

  private static applyUnified(config: UnifiedViewConfig): ApplicationResult {
    const projectionStore = useProjectionStore()
    const parameterStore = useParameterStore()
    const presetDefaults = getSharedPresetDefaults()

    try {
      projectionStore.selectedProjection = config.projection.id as ProjectionId

      if (config.projection.parameters) {
        const params = { ...config.projection.parameters } as ProjectionParameters
        parameterStore.setAtlasParameters(params)
        presetDefaults.storeGlobalParameters(params)
      }
      else {
        parameterStore.setAtlasParameters({})
        presetDefaults.storeGlobalParameters(null)
      }

      return {
        success: true,
        errors: [],
        warnings: [],
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Failed to apply unified preset: ${error}`],
        warnings: [],
      }
    }
  }

  private static applySplit(config: SplitViewConfig): ApplicationResult {
    const parameterStore = useParameterStore()

    try {
      if (config.territories) {
        for (const [code, territoryConfig] of Object.entries(config.territories)) {
          parameterStore.setTerritoryProjection(code as TerritoryCode, territoryConfig.projection.id as ProjectionId)
          if (territoryConfig.projection.parameters) {
            parameterStore.setTerritoryParameters(code as TerritoryCode, territoryConfig.projection.parameters)
          }
        }
      }

      return {
        success: true,
        errors: [],
        warnings: [],
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Failed to apply split preset: ${error}`],
        warnings: [],
      }
    }
  }

  private static applyCompositeExisting(config: CompositeExistingViewConfig): ApplicationResult {
    const projectionStore = useProjectionStore()

    try {
      projectionStore.compositeProjection = config.projectionId as ProjectionId

      if (config.globalScale !== undefined) {
        debug('Global scale from preset (not applied): %d', config.globalScale)
      }

      return {
        success: true,
        errors: [],
        warnings: config.globalScale !== undefined ? ['Global scale is not yet supported for built-in-composite mode'] : [],
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Failed to apply built-in-composite preset: ${error}`],
        warnings: [],
      }
    }
  }
}
