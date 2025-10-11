import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { useConfigStore } from '@/stores/config'
import { useTerritoryStore } from '@/stores/territory'

/**
 * Manages projection configuration and provides projection helper functions
 */
export function useProjectionConfig() {
  const { t } = useI18n()
  const configStore = useConfigStore()
  const territoryStore = useTerritoryStore()

  /**
   * Get available composite projections for current atlas
   */
  const compositeProjectionOptions = computed(() => {
    // Get the current region's available composite projections
    const atlasConfig = configStore.currentAtlasConfig
    const availableProjections = atlasConfig.compositeProjections || []

    // Get all composite projections from registry and filter by region
    return projectionRegistry.getAll()
      .filter(def => def.family === ProjectionFamily.COMPOSITE && availableProjections.includes(def.id))
      .map(def => ({ value: def.id, label: t(def.name), translated: true }))
  })

  /**
   * Get projection for mainland in individual mode
   */
  function getMainlandProjection() {
    if (configStore.projectionMode === 'individual') {
      const mainlandCode = configStore.currentAtlasConfig.splitModeConfig?.mainlandCode
      if (mainlandCode) {
        return territoryStore.territoryProjections[mainlandCode] || configStore.selectedProjection
      }
    }
    return configStore.selectedProjection
  }

  /**
   * Get projection for a specific territory
   */
  function getTerritoryProjection(territoryCode: string) {
    if (configStore.projectionMode === 'individual') {
      // Use territory-specific projection if defined, otherwise use default
      return territoryStore.territoryProjections[territoryCode] || configStore.selectedProjection
    }
    // Use uniform projection
    return configStore.selectedProjection
  }

  return {
    compositeProjectionOptions,
    getMainlandProjection,
    getTerritoryProjection,
  }
}
