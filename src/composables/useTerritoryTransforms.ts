import { computed } from 'vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import {
  SCALE_RANGE,
  TRANSLATION_RANGES,
} from '@/core/atlases/constants'
import { createDefaultTranslations } from '@/core/atlases/utils'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useTerritoryStore } from '@/stores/territory'

/**
 * Manages territory transformation controls (projections, translations, scales)
 */
export function useTerritoryTransforms() {
  const configStore = useConfigStore()
  const geoDataStore = useGeoDataStore()
  const territoryStore = useTerritoryStore()
  const parameterStore = useParameterStore()
  const presetDefaults = getSharedPresetDefaults()

  /**
   * Get list of territories from geoData store
   */
  const territories = computed(() => {
    return geoDataStore.filteredTerritories.map(t => ({
      code: t.code,
      name: t.name,
    }))
  })

  /**
   * Check if we should show mainland section (only for single-focus pattern)
   */
  const showMainland = computed(() => {
    const patternService = AtlasPatternService.fromPattern(configStore.currentAtlasConfig.pattern)
    return patternService.isSingleFocus()
  })

  /**
   * Get mainland code from region config
   */
  const mainlandCode = computed(() => {
    return configStore.currentAtlasConfig.splitModeConfig?.mainlandCode || 'MAINLAND'
  })

  /**
   * Check if mainland is in filtered territories
   */
  const isMainlandInTerritories = computed(() => {
    return geoDataStore.filteredTerritories.some(t => t.code === mainlandCode.value)
  })

  /**
   * Get territory translations from store
   */
  const translations = computed(() => territoryStore.territoryTranslations)

  /**
   * Get territory scale multipliers from parameter store
   */
  const scales = computed(() => {
    const scalesMap: Record<string, number> = {}
    territories.value.forEach(t => {
      const params = parameterStore.getTerritoryParameters(t.code)
      scalesMap[t.code] = params.scaleMultiplier ?? 1.0
    })
    return scalesMap
  })

  /**
   * Set translation for a territory
   */
  function setTerritoryTranslation(territoryCode: string, axis: 'x' | 'y', value: number) {
    territoryStore.setTerritoryTranslation(territoryCode, axis, value)
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
    territoryStore.setTerritoryProjection(territoryCode, projectionId)
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
          territoryStore.setTerritoryProjection(code, projection)
        })
        Object.entries(originalDefaults.translations).forEach(([code, translation]) => {
          territoryStore.setTerritoryTranslation(code, 'x', translation.x)
          territoryStore.setTerritoryTranslation(code, 'y', translation.y)
        })
        Object.entries(originalDefaults.scales).forEach(([code, scale]) => {
          territoryStore.setTerritoryScale(code, scale)
        })

        // Apply preset parameters if they exist
        const originalParameters = presetDefaults.presetParameters.value
        Object.entries(originalParameters).forEach(([territoryCode, params]) => {
          parameterStore.setTerritoryParameters(territoryCode, params as any)
        })

        console.info('[Reset] Restored to preset defaults')
        return
      }
    }

    // Fallback: Reset to hardcoded defaults if no preset available
    const territories = atlasService.getAllTerritories()

    // Clear all parameter overrides
    for (const t of geoDataStore.filteredTerritories) {
      parameterStore.clearAllTerritoryOverrides(t.code)
    }

    // Reset all translations to defaults
    const defaultTranslations = createDefaultTranslations(territories)
    for (const [code, { x, y }] of Object.entries(defaultTranslations)) {
      territoryStore.setTerritoryTranslation(code, 'x', x)
      territoryStore.setTerritoryTranslation(code, 'y', y)
    }

    // Reset all scales to 1.0
    const defaultScale = 1.0
    for (const t of geoDataStore.filteredTerritories) {
      territoryStore.setTerritoryScale(t.code, defaultScale)
    }

    console.info('[Reset] Restored to fallback defaults (no preset available)')
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
          territoryStore.setTerritoryProjection(territoryCode, originalDefaults.projections[territoryCode])
        }
        if (originalDefaults.translations[territoryCode]) {
          const translation = originalDefaults.translations[territoryCode]
          territoryStore.setTerritoryTranslation(territoryCode, 'x', translation.x)
          territoryStore.setTerritoryTranslation(territoryCode, 'y', translation.y)
        }
        if (originalDefaults.scales[territoryCode]) {
          territoryStore.setTerritoryScale(territoryCode, originalDefaults.scales[territoryCode])
        }

        // Apply preset parameters if they exist for this territory
        if (originalParameters[territoryCode]) {
          parameterStore.setTerritoryParameters(territoryCode, originalParameters[territoryCode] as any)
        }

        console.info(`[Reset] Restored territory ${territoryCode} to preset defaults`)
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
    territoryStore.setTerritoryTranslation(territoryCode, 'x', 0)
    territoryStore.setTerritoryTranslation(territoryCode, 'y', 0)

    // Reset scale to 1.0
    territoryStore.setTerritoryScale(territoryCode, 1.0)

    console.info(`[Reset] Restored territory ${territoryCode} to fallback defaults (no preset available)`)
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
   * Get current atlas config
   */
  const currentAtlasConfig = computed(() => configStore.currentAtlasConfig)

  /**
   * Get territory projections
   */
  const territoryProjections = computed(() => territoryStore.territoryProjections)

  /**
   * Get selected projection
   */
  const selectedProjection = computed(() => configStore.selectedProjection)

  /**
   * Get projection mode
   */
  const projectionMode = computed(() => configStore.projectionMode)

  /**
   * Determine if empty state alert should be shown in TerritoryControls
   * Shows when no territories AND not in individual mode with mainland
   */
  const shouldShowEmptyState = computed(() => {
    const hasNoTerritories = territories.value.length === 0
    const hasMainlandInIndividualMode = projectionMode.value === 'individual'
      && (showMainland.value || isMainlandInTerritories.value)

    return hasNoTerritories && !hasMainlandInIndividualMode
  })

  return {
    territories,
    showMainland,
    mainlandCode,
    isMainlandInTerritories,
    translations,
    scales,
    translationRanges: TRANSLATION_RANGES,
    scaleRange: SCALE_RANGE,
    projectionRecommendations,
    projectionGroups,
    currentAtlasConfig,
    territoryProjections,
    selectedProjection,
    projectionMode,
    shouldShowEmptyState,
    setTerritoryTranslation,
    setTerritoryScale,
    setTerritoryProjection,
    resetTransforms,
    resetTerritoryToDefaults,
  }
}
