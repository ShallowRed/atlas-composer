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

/**
 * Territory Reset Composable
 *
 * Single responsibility: Orchestrate territory reset operations.
 * Delegates calculation to TerritoryResetService, handles execution.
 *
 * Separation of concerns:
 * - Service: Calculates WHAT to reset (pure business logic)
 * - Composable: Executes HOW to reset (orchestration)
 *
 * Returns:
 * - resetTransforms: Reset all territories to defaults
 * - resetTerritoryToDefaults: Reset single territory to defaults
 */
export function useTerritoryReset() {
  const atlasStore = useAtlasStore()
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const viewStore = useViewStore()
  const presetDefaults = getSharedPresetDefaults()

  /**
   * Execute bulk reset operations
   */
  function executeBulkReset(operation: BulkResetOperation) {
    // Execute each territory operation
    operation.operations.forEach((territoryOp) => {
      executeTerritoryOperation(territoryOp)
    })

    // Update active territories if specified
    if (operation.activeTerritories) {
      // Convert: activeTerritories from operation may be string[]
      viewStore.setActiveTerritories(operation.activeTerritories as TerritoryCode[])
    }

    // Update cartographer for all territories
    if (geoDataStore.cartographer) {
      operation.operations.forEach((op) => {
        // Convert: Operation territoryCode from service is string
        const code = op.territoryCode as TerritoryCode
        if (op.projection) {
          geoDataStore.cartographer?.updateTerritoryProjection(code, op.projection)
        }
        geoDataStore.cartographer?.updateTerritoryParameters(code)
      })
    }
  }

  /**
   * Execute single territory reset operation
   */
  function executeTerritoryOperation(operation: TerritoryResetOperation) {
    const { territoryCode, projection, translation, scale, parameters, shouldClearOverrides } = operation

    // Convert: Operation territoryCode from service is string
    const code = territoryCode as TerritoryCode

    // Clear overrides if specified
    if (shouldClearOverrides) {
      parameterStore.clearAllTerritoryOverrides(code)
    }

    // Set projection if provided
    if (projection) {
      parameterStore.setTerritoryProjection(code, projection)
    }

    // Set translation
    parameterStore.setTerritoryTranslation(code, 'x', translation.x)
    parameterStore.setTerritoryTranslation(code, 'y', translation.y)

    // Set scale
    parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)

    // Apply additional parameters if provided
    if (parameters) {
      parameterStore.setTerritoryParameters(code, parameters as any)
    }

    // Update cartographer
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

    // Calculate reset operations using service
    const operation = TerritoryResetService.calculateBulkReset({
      territories: atlasService.getAllTerritories(),
      presetDefaults: presetDefaults.presetDefaults.value ?? undefined,
      presetParameters: presetDefaults.presetParameters.value ?? undefined,
    })

    // Execute the operations
    executeBulkReset(operation)

    const strategy = operation.activeTerritories ? 'preset' : 'fallback'
    debug(`Reset all territories using ${strategy} strategy`)
  }

  /**
   * Reset a specific territory to its defaults
   * Uses preset defaults if available, otherwise falls back to hardcoded defaults
   */
  function resetTerritoryToDefaults(territoryCode: string) {
    // Calculate reset operation using service
    const operation = TerritoryResetService.calculateTerritoryReset({
      territoryCode,
      presetDefaults: presetDefaults.presetDefaults.value ?? undefined,
      presetParameters: presetDefaults.presetParameters.value ?? undefined,
    })

    // Execute the operation
    executeTerritoryOperation(operation)

    const strategy = operation.projection ? 'preset' : 'fallback'
    debug(`Reset territory ${territoryCode} using ${strategy} strategy`)
  }

  return {
    resetTransforms,
    resetTerritoryToDefaults,
  }
}
