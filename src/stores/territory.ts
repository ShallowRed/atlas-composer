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
  const territoryScales = ref<Record<string, number>>({})

  // Actions
  function initializeDefaults(territories: TerritoryConfig[], defaultProjection: string) {
    const defaults = TerritoryDefaultsService.initializeAll(territories, defaultProjection)
    territoryProjections.value = defaults.projections
    territoryTranslations.value = defaults.translations
    territoryScales.value = defaults.scales
  }

  function setTerritoryProjection(territoryCode: string, projectionId: string) {
    territoryProjections.value[territoryCode] = projectionId
  }

  function setTerritoryTranslation(territoryCode: string, axis: 'x' | 'y', value: number) {
    if (!territoryTranslations.value[territoryCode]) {
      territoryTranslations.value[territoryCode] = { x: 0, y: 0 }
    }
    territoryTranslations.value[territoryCode][axis] = value
  }

  function setTerritoryScale(territoryCode: string, value: number) {
    territoryScales.value[territoryCode] = value
  }

  function resetAll(territories: TerritoryConfig[], defaultProjection: string) {
    initializeDefaults(territories, defaultProjection)
  }

  return {
    // State
    territoryProjections,
    territoryTranslations,
    territoryScales,

    // Actions
    initializeDefaults,
    setTerritoryProjection,
    setTerritoryTranslation,
    setTerritoryScale,
    resetAll,
  }
})
