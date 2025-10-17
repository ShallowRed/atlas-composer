import type { TerritoryConfig } from '@/types'

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'

/**
 * Territory Store - Manages territory-specific configuration
 * Handles projections, translations, and scales for individual territories
 */
export const useTerritoryStore = defineStore('territory', () => {
  // State
  const territoryProjections = ref<Record<string, string>>({})
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>({})
  // NOTE: territoryScales removed - scale multiplier now stored in parameter store only
  // NOTE: territoryClipExtents removed - pixelClipExtent now stored in parameter store only

  // Actions
  function initializeDefaults(territories: TerritoryConfig[], defaultProjection: string) {
    const defaults = TerritoryDefaultsService.initializeAll(territories, defaultProjection)
    territoryProjections.value = defaults.projections
    territoryTranslations.value = defaults.translations
    // scales initialization removed - handled by parameter store
    // clipExtents initialization removed - handled by parameter store
  }

  function setTerritoryProjection(territoryCode: string, projectionId: string) {
    territoryProjections.value = {
      ...territoryProjections.value,
      [territoryCode]: projectionId,
    }
  }

  function setTerritoryTranslation(territoryCode: string, axis: 'x' | 'y', value: number) {
    if (!territoryTranslations.value[territoryCode]) {
      territoryTranslations.value[territoryCode] = { x: 0, y: 0 }
    }
    territoryTranslations.value[territoryCode][axis] = value
  }

  // setTerritoryScale removed - use parameter store's setTerritoryParameter(code, 'scaleMultiplier', value) instead
  // setTerritoryClipExtent removed - use parameter store's setTerritoryParameter(code, 'pixelClipExtent', value) instead

  function resetAll(territories: TerritoryConfig[], defaultProjection: string) {
    initializeDefaults(territories, defaultProjection)
  }

  return {
    // State
    territoryProjections,
    territoryTranslations,
    // territoryScales removed - use parameter store
    // territoryClipExtents removed - use parameter store

    // Actions
    initializeDefaults,
    setTerritoryProjection,
    setTerritoryTranslation,
    // setTerritoryScale removed - use parameter store
    // setTerritoryClipExtent removed - use parameter store
    resetAll,
  }
})
