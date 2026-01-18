import type { BulkResetOperation, TerritoryResetOperation } from '@/services/territory/types'
import type { TerritoryCode } from '@/types'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { TerritoryResetService } from '@/services/territory/territory-reset-service'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.vue.composable

export function useTerritoryReset() {
  const atlasStore = useAtlasStore()
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const viewStore = useViewStore()
  const presetDefaults = getSharedPresetDefaults()

  function executeBulkReset(operation: BulkResetOperation) {
    operation.operations.forEach((territoryOp) => {
      executeTerritoryOperation(territoryOp)
    })

    if (operation.activeTerritories) {
      viewStore.setActiveTerritories(operation.activeTerritories as TerritoryCode[])
    }

    if (geoDataStore.cartographer) {
      operation.operations.forEach((op) => {
        const code = op.territoryCode as TerritoryCode
        if (op.projection) {
          geoDataStore.cartographer?.updateTerritoryProjection(code, op.projection)
        }
        geoDataStore.cartographer?.updateTerritoryParameters(code)
      })
    }
  }

  function executeTerritoryOperation(operation: TerritoryResetOperation) {
    const { territoryCode, projection, translation, scale, parameters, shouldClearOverrides } = operation

    const code = territoryCode as TerritoryCode

    if (shouldClearOverrides) {
      parameterStore.clearAllTerritoryOverrides(code)
    }

    if (projection) {
      parameterStore.setTerritoryProjection(code, projection)
    }

    parameterStore.setTerritoryTranslation(code, 'x', translation.x)
    parameterStore.setTerritoryTranslation(code, 'y', translation.y)

    parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)

    if (parameters) {
      parameterStore.setTerritoryParameters(code, parameters as any)
    }

    if (geoDataStore.cartographer) {
      if (projection) {
        geoDataStore.cartographer.updateTerritoryProjection(code, projection)
      }
      geoDataStore.cartographer.updateTerritoryParameters(code)
    }
  }

  /**
   * Reset all territories to defaults
   * Uses preset defaults if available, otherwise falls back to hardcoded defaults
   */
  function resetTransforms() {
    const atlasService = atlasStore.atlasService
    if (!atlasService) {
      debug('Cannot reset: no atlas service available')
      return
    }

    const operation = TerritoryResetService.calculateBulkReset({
      territories: atlasService.getAllTerritories(),
      presetDefaults: presetDefaults.presetDefaults.value ?? undefined,
      presetParameters: presetDefaults.presetParameters.value ?? undefined,
    })

    executeBulkReset(operation)

    const strategy = operation.activeTerritories ? 'preset' : 'fallback'
    debug(`Reset all territories using ${strategy} strategy`)
  }

  function resetTerritoryToDefaults(territoryCode: string) {
    const operation = TerritoryResetService.calculateTerritoryReset({
      territoryCode,
      presetDefaults: presetDefaults.presetDefaults.value ?? undefined,
      presetParameters: presetDefaults.presetParameters.value ?? undefined,
    })

    executeTerritoryOperation(operation)

    const strategy = operation.projection ? 'preset' : 'fallback'
    debug(`Reset territory ${territoryCode} using ${strategy} strategy`)
  }

  return {
    resetTransforms,
    resetTerritoryToDefaults,
  }
}
