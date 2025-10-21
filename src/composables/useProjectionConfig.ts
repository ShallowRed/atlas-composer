import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDefaultPreset } from '@/core/atlases/registry'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
import { useConfigStore } from '@/stores/config'
import { useParameterStore } from '@/stores/parameters'

/**
 * Manages projection configuration and provides projection helper functions
 */
export function useProjectionConfig() {
  const { t } = useI18n()
  const configStore = useConfigStore()
  const parameterStore = useParameterStore()

  // Reactive state for composite projections
  const availableCompositeProjections = ref<string[]>([])

  // Load composite projections when atlas changes
  watch(() => configStore.selectedAtlas, async (atlasId) => {
    if (atlasId && configStore.currentAtlasConfig) {
      // Get default preset from atlas registry
      const defaultPresetDef = getDefaultPreset(atlasId)
      const compositeProjections = await AtlasMetadataService.getCompositeProjections(
        atlasId,
        defaultPresetDef?.id,
      )
      availableCompositeProjections.value = compositeProjections || []
    }
  }, { immediate: true })

  /**
   * Get available composite projections for current atlas
   */
  const compositeProjectionOptions = computed(() => {
    // Get all composite projections from registry and filter by region
    return projectionRegistry.getAll()
      .filter(def => def.family === ProjectionFamily.COMPOSITE && availableCompositeProjections.value.includes(def.id))
      .map(def => ({ value: def.id, label: t(def.name), translated: true }))
  })

  /**
   * Get projection for mainland in split mode
   */
  function getMainlandProjection() {
    // In split mode, use per-territory projections
    if (configStore.viewMode === 'split') {
      const mainlandCode = configStore.currentAtlasConfig?.splitModeConfig?.mainlandCode
      if (mainlandCode) {
        return parameterStore.getTerritoryProjection(mainlandCode) || configStore.selectedProjection
      }
    }
    return configStore.selectedProjection
  }

  /**
   * Get projection for a specific territory
   */
  function getTerritoryProjection(territoryCode: string) {
    // In split or composite-custom mode, use per-territory projections
    if (configStore.viewMode === 'split' || configStore.viewMode === 'composite-custom') {
      // Use territory-specific projection if defined, otherwise use default
      return parameterStore.getTerritoryProjection(territoryCode) || configStore.selectedProjection
    }
    // Use uniform projection for unified and built-in-composite modes
    return configStore.selectedProjection
  }

  return {
    compositeProjectionOptions,
    getMainlandProjection,
    getTerritoryProjection,
  }
}
