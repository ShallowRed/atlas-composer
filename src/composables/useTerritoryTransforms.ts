import { computed } from 'vue'
import {
  SCALE_RANGE,
  TRANSLATION_RANGES,
} from '@/core/atlases/constants'
import { createDefaultTranslations } from '@/core/atlases/utils'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useTerritoryStore } from '@/stores/territory'

/**
 * Manages territory transformation controls (projections, translations, scales)
 */
export function useTerritoryTransforms() {
  const configStore = useConfigStore()
  const geoDataStore = useGeoDataStore()
  const territoryStore = useTerritoryStore()

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
   * Get territory scales from store
   */
  const scales = computed(() => territoryStore.territoryScales)

  /**
   * Set translation for a territory
   */
  function setTerritoryTranslation(territoryCode: string, axis: 'x' | 'y', value: number) {
    territoryStore.setTerritoryTranslation(territoryCode, axis, value)
  }

  /**
   * Set scale for a territory
   */
  function setTerritoryScale(territoryCode: string, value: number) {
    territoryStore.setTerritoryScale(territoryCode, value)
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

    // Reset all translations to defaults
    const territories = atlasService.getAllTerritories()
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
  }
}
