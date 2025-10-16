import type { ClipExtent, TerritoryConfig } from '@/types'

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
  const territoryClipExtents = ref<Record<string, ClipExtent | null>>({})
  // NOTE: territoryScales removed - scale multiplier now stored in parameter store only

  // Actions
  function initializeDefaults(territories: TerritoryConfig[], defaultProjection: string) {
    const defaults = TerritoryDefaultsService.initializeAll(territories, defaultProjection)
    territoryProjections.value = defaults.projections
    territoryTranslations.value = defaults.translations
    // Initialize clipExtents if provided from preset
    if (defaults.clipExtents) {
      territoryClipExtents.value = defaults.clipExtents
    }
    // scales initialization removed - handled by parameter store
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

  function setTerritoryClipExtent(territoryCode: string, clipExtent: ClipExtent | null) {
    console.debug(`[TerritoryStore] Setting clipExtent for ${territoryCode}:`, clipExtent)
    territoryClipExtents.value = {
      ...territoryClipExtents.value,
      [territoryCode]: clipExtent,
    }
  }

  // setTerritoryScale removed - use parameter store's setTerritoryParameter(code, 'scaleMultiplier', value) instead

  function resetAll(territories: TerritoryConfig[], defaultProjection: string) {
    initializeDefaults(territories, defaultProjection)
  }

  return {
    // State
    territoryProjections,
    territoryTranslations,
    territoryClipExtents,
    // territoryScales removed - use parameter store

    // Actions
    initializeDefaults,
    setTerritoryProjection,
    setTerritoryTranslation,
    setTerritoryClipExtent,
    // setTerritoryScale removed - use parameter store
    resetAll,
  }
})
