import { computed } from 'vue'

import { useAtlasConfig } from '@/composables/useAtlasConfig'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { logger } from '@/utils/logger'

const debug = logger.vue.composable

/**
 * Manages territory transformation controls (projections, translations, scales)
 */
export function useTerritoryTransforms() {
  const configStore = useConfigStore()
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const presetDefaults = getSharedPresetDefaults()
  const { currentAtlasConfig } = useAtlasConfig()

  /**
   * Get list of overseas territories from geoData store
   */
  const territories = computed(() => {
    return geoDataStore.overseasTerritories.map(t => ({
      code: t.code,
      name: t.name,
    }))
  })

  /**
   * Check if we should show mainland section (only for single-focus pattern)
   */
  const showMainland = computed(() => {
    const atlasConfig = currentAtlasConfig.value
    if (!atlasConfig)
      return false
    const patternService = AtlasPatternService.fromPattern(atlasConfig.pattern)
    return patternService.isSingleFocus()
  })

  /**
   * Get mainland code from region config
   */
  const mainlandCode = computed(() => {
    return currentAtlasConfig.value?.splitModeConfig?.mainlandCode || 'MAINLAND'
  })

  /**
   * Check if mainland is in active territories
   */
  const isMainlandInTerritories = computed(() => {
    return geoDataStore.allActiveTerritories.some(t => t.code === mainlandCode.value)
  })

  /**
   * Get territory translations from parameter store
   */
  const translations = computed(() => {
    const translationsMap: Record<string, { x: number, y: number }> = {}
    territories.value.forEach((t) => {
      translationsMap[t.code] = parameterStore.getTerritoryTranslation(t.code)
    })
    return translationsMap
  })

  /**
   * Get territory scale multipliers from parameter store
   */
  const scales = computed(() => {
    const scalesMap: Record<string, number> = {}
    territories.value.forEach((t) => {
      const params = parameterStore.getTerritoryParameters(t.code)
      scalesMap[t.code] = params.scaleMultiplier ?? 1.0
    })
    return scalesMap
  })

  /**
   * Set translation for a territory
   */
  function setTerritoryTranslation(territoryCode: string, axis: 'x' | 'y', value: number) {
    parameterStore.setTerritoryTranslation(territoryCode, axis, value)
  }

  /**
   * Set scale multiplier for a territory
   */
  function setTerritoryScale(territoryCode: string, value: number) {
    parameterStore.setTerritoryParameter(territoryCode, 'scaleMultiplier', value)
  }

  /**
   * Set projection for a territory
   */
  function setTerritoryProjection(territoryCode: string, projectionId: string) {
    parameterStore.setTerritoryProjection(territoryCode, projectionId)
  }

  /**
   * Reset transforms (translations and scales) to defaults
   */
  function resetTransforms() {
    const atlasService = configStore.atlasService
    if (!atlasService)
      return

    // If we have preset defaults, restore from preset
    if (presetDefaults.hasPresetDefaults()) {
      const originalDefaults = presetDefaults.presetDefaults.value
      if (originalDefaults) {
        // Clear all parameter overrides first
        for (const territoryCode of Object.keys(originalDefaults.projections)) {
          parameterStore.clearAllTerritoryOverrides(territoryCode)
        }

        // Reset to preset defaults
        Object.entries(originalDefaults.projections).forEach(([code, projection]) => {
          parameterStore.setTerritoryProjection(code, projection)
        })
        Object.entries(originalDefaults.translations).forEach(([code, translation]) => {
          parameterStore.setTerritoryTranslation(code, 'x', translation.x)
          parameterStore.setTerritoryTranslation(code, 'y', translation.y)
        })
        Object.entries(originalDefaults.scales).forEach(([code, scale]) => {
          parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)
        })

        // Apply preset parameters if they exist
        const originalParameters = presetDefaults.presetParameters.value
        Object.entries(originalParameters).forEach(([territoryCode, params]) => {
          parameterStore.setTerritoryParameters(territoryCode, params as any)
        })

        // Reset active territory set to preset defaults (for custom composite mode)
        const presetTerritoryCodes = Object.keys(originalDefaults.projections)
        configStore.setActiveTerritories(presetTerritoryCodes)

        // Update cartographer for all territories to apply the changes
        if (geoDataStore.cartographer) {
          Object.entries(originalDefaults.projections).forEach(([code, projectionId]) => {
            // First update the projection type (recreates the D3 projection object)
            geoDataStore.cartographer?.updateTerritoryProjection(code, projectionId)
            // Then update parameters for the new projection
            geoDataStore.cartographer?.updateTerritoryParameters(code)
          })
        }

        debug('Restored to preset defaults including territory set')
        return
      }
    }

    // Fallback: Reset to hardcoded defaults if no preset available
    const territories = atlasService.getAllTerritories()

    // Clear all parameter overrides for ALL territories
    for (const t of territories) {
      parameterStore.clearAllTerritoryOverrides(t.code)
    }

    // Reset all translations to zero (no config-level defaults)
    for (const t of territories) {
      parameterStore.setTerritoryTranslation(t.code, 'x', 0)
      parameterStore.setTerritoryTranslation(t.code, 'y', 0)
    }

    // Reset all scales to 1.0 for ALL territories
    const defaultScale = 1.0
    for (const t of territories) {
      parameterStore.setTerritoryParameter(t.code, 'scaleMultiplier', defaultScale)
    }

    // Update cartographer for all territories to apply the changes
    if (geoDataStore.cartographer) {
      territories.forEach((t: { code: string }) => {
        geoDataStore.cartographer?.updateTerritoryParameters(t.code)
      })
    }

    debug('Restored to fallback defaults (no preset available)')
  }

  /**
   * Reset a specific territory to its preset defaults (or hardcoded defaults if no preset)
   */
  function resetTerritoryToDefaults(territoryCode: string) {
    // If we have preset defaults, restore from preset
    if (presetDefaults.hasPresetDefaults()) {
      const originalDefaults = presetDefaults.presetDefaults.value
      const originalParameters = presetDefaults.presetParameters.value

      if (originalDefaults && originalDefaults.projections[territoryCode]) {
        // Clear parameter overrides first
        parameterStore.clearAllTerritoryOverrides(territoryCode)

        // Reset to preset defaults for this territory
        if (originalDefaults.projections[territoryCode]) {
          parameterStore.setTerritoryProjection(territoryCode, originalDefaults.projections[territoryCode])
        }
        if (originalDefaults.translations[territoryCode]) {
          const translation = originalDefaults.translations[territoryCode]
          parameterStore.setTerritoryTranslation(territoryCode, 'x', translation.x)
          parameterStore.setTerritoryTranslation(territoryCode, 'y', translation.y)
        }
        if (originalDefaults.scales[territoryCode]) {
          parameterStore.setTerritoryParameter(territoryCode, 'scaleMultiplier', originalDefaults.scales[territoryCode])
        }

        // Apply preset parameters if they exist for this territory
        if (originalParameters[territoryCode]) {
          parameterStore.setTerritoryParameters(territoryCode, originalParameters[territoryCode] as any)
        }

        // Update cartographer to apply the reset changes
        if (geoDataStore.cartographer) {
          // First update the projection type (recreates the D3 projection object)
          geoDataStore.cartographer.updateTerritoryProjection(territoryCode, originalDefaults.projections[territoryCode])
          // Then update parameters for the new projection
          geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
        }

        debug('Restored territory %s to preset defaults', territoryCode)
        return
      }
    }

    // Fallback: Reset to hardcoded defaults if no preset available
    const atlasService = configStore.atlasService
    if (!atlasService)
      return

    // Clear parameter overrides
    parameterStore.clearAllTerritoryOverrides(territoryCode)

    // Reset translation to default (0, 0)
    parameterStore.setTerritoryTranslation(territoryCode, 'x', 0)
    parameterStore.setTerritoryTranslation(territoryCode, 'y', 0)

    // Reset scale to 1.0
    parameterStore.setTerritoryParameter(territoryCode, 'scaleMultiplier', 1.0)

    // Update cartographer to apply the reset changes
    if (geoDataStore.cartographer) {
      geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
    }

    debug('Restored territory %s to fallback defaults (no preset available)', territoryCode)
  }

  /**
   * Get projection recommendations
   */
  const projectionRecommendations = computed(() => configStore.projectionRecommendations)

  /**
   * Get projection groups
   */
  const projectionGroups = computed(() => configStore.projectionGroups)

  /**
   * Get territory projections from parameter store
   */
  const territoryProjections = computed(() => {
    // Access version to ensure reactivity when projections change
    void parameterStore.territoryParametersVersion

    const projectionsMap: Record<string, string> = {}
    territories.value.forEach((t) => {
      const projectionId = parameterStore.getTerritoryProjection(t.code)
      if (projectionId) {
        projectionsMap[t.code] = projectionId
      }
    })
    return projectionsMap
  })

  /**
   * Get selected projection
   */
  const selectedProjection = computed(() => configStore.selectedProjection)

  /**
   * Determine if empty state alert should be shown in TerritoryControls
   * Shows when no territories AND not showing mainland
   * Always uses individual projections per territory
   */
  const shouldShowEmptyState = computed(() => {
    const hasNoTerritories = territories.value.length === 0
    const hasMainlandToShow = showMainland.value || isMainlandInTerritories.value

    return hasNoTerritories && !hasMainlandToShow
  })

  return {
    territories,
    showMainland,
    mainlandCode,
    isMainlandInTerritories,
    translations,
    scales,
    projectionRecommendations,
    projectionGroups,
    currentAtlasConfig,
    territoryProjections,
    selectedProjection,
    shouldShowEmptyState,
    setTerritoryTranslation,
    setTerritoryScale,
    setTerritoryProjection,
    resetTransforms,
    resetTerritoryToDefaults,
  }
}
