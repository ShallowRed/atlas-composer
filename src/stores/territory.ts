import type { TerritoryConfig } from '@/types'

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'

/**
 * Territory-specific projection parameters
 */
interface TerritoryProjectionParams {
  rotateLongitude?: number
  rotateLatitude?: number
  centerLongitude?: number
  centerLatitude?: number
  parallel1?: number
  parallel2?: number
}

/**
 * Territory Store - Manages territory-specific configuration
 * Handles projections, translations, and scales for individual territories
 */
export const useTerritoryStore = defineStore('territory', () => {
  // State
  const territoryProjections = ref<Record<string, string>>({})
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>({})
  const territoryScales = ref<Record<string, number>>({})
  const territoryProjectionParams = ref<Record<string, TerritoryProjectionParams>>({})

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

  function setTerritoryProjectionParam(
    territoryCode: string,
    param: keyof TerritoryProjectionParams,
    value: number | null,
  ) {
    if (!territoryProjectionParams.value[territoryCode]) {
      territoryProjectionParams.value[territoryCode] = {}
    }
    if (value === null) {
      delete territoryProjectionParams.value[territoryCode][param]
    }
    else {
      territoryProjectionParams.value[territoryCode][param] = value
    }
  }

  function resetTerritoryProjectionParams(territoryCode: string) {
    territoryProjectionParams.value[territoryCode] = {}
  }

  function resetAll(territories: TerritoryConfig[], defaultProjection: string) {
    initializeDefaults(territories, defaultProjection)
    territoryProjectionParams.value = {}
  }

  return {
    // State
    territoryProjections,
    territoryTranslations,
    territoryScales,
    territoryProjectionParams,

    // Actions
    initializeDefaults,
    setTerritoryProjection,
    setTerritoryTranslation,
    setTerritoryScale,
    setTerritoryProjectionParam,
    resetTerritoryProjectionParams,
    resetAll,
  }
})
