import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryCode, Translation } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { defineStore } from 'pinia'
import { computed, ref, toRaw } from 'vue'

function areValuesEqual(a: any, b: any): boolean {
  const rawA = toRaw(a)
  const rawB = toRaw(b)

  if (rawA === rawB)
    return true

  if (Array.isArray(rawA) && Array.isArray(rawB)) {
    if (rawA.length !== rawB.length)
      return false
    return rawA.every((val, index) => areValuesEqual(val, rawB[index]))
  }

  if (rawA && rawB && typeof rawA === 'object' && typeof rawB === 'object' && !Array.isArray(rawA) && !Array.isArray(rawB)) {
    const keysA = Object.keys(rawA)
    const keysB = Object.keys(rawB)
    if (keysA.length !== keysB.length)
      return false
    return keysA.every(key => areValuesEqual(rawA[key], rawB[key]))
  }

  return false
}

export const usePresetDefaultsStore = defineStore('presetDefaults', () => {
  const territoryDefaults = ref<TerritoryDefaults | null>(null)
  const presetParameters = ref<Record<string, ProjectionParameters>>({})
  const presetGlobalParameters = ref<ProjectionParameters | null>(null)

  function storePresetDefaults(
    defaults: TerritoryDefaults,
    parameters: Record<string, ProjectionParameters>,
  ) {
    territoryDefaults.value = {
      projections: { ...defaults.projections },
      translations: { ...defaults.translations },
      scales: { ...defaults.scales },
    }
    presetParameters.value = { ...parameters }
  }

  function storeGlobalParameters(parameters: ProjectionParameters | null) {
    presetGlobalParameters.value = parameters ? { ...parameters } : null
  }

  function clearAll() {
    territoryDefaults.value = null
    presetParameters.value = {}
    presetGlobalParameters.value = null
  }

  function getPresetDefaultsForTerritory(territoryCode: string) {
    if (!territoryDefaults.value) {
      return null
    }

    const code = territoryCode as TerritoryCode
    return {
      projection: territoryDefaults.value.projections[code],
      translation: territoryDefaults.value.translations[code],
      scale: territoryDefaults.value.scales[code],
      parameters: presetParameters.value[code],
    }
  }

  const hasPresetDefaults = computed(() => territoryDefaults.value !== null)

  function hasDivergingParameters(
    currentTranslations: Record<string, Translation>,
    currentScales: Record<string, number>,
    territoryParameters: Record<string, Record<string, unknown>>,
    currentProjections?: Record<string, string>,
  ): boolean {
    if (!territoryDefaults.value) {
      return false
    }

    if (currentProjections) {
      for (const [territoryCode, currentProjection] of Object.entries(currentProjections)) {
        const presetProjection = territoryDefaults.value.projections[territoryCode as TerritoryCode]
        if (presetProjection && currentProjection !== presetProjection) {
          return true
        }
      }
    }

    for (const [territoryCode, currentTranslation] of Object.entries(currentTranslations)) {
      const presetTranslation = territoryDefaults.value.translations[territoryCode as TerritoryCode]
      if (presetTranslation) {
        if (
          currentTranslation.x !== presetTranslation.x
          || currentTranslation.y !== presetTranslation.y
        ) {
          return true
        }
      }
    }

    for (const [territoryCode, currentScale] of Object.entries(currentScales)) {
      const presetScale = territoryDefaults.value.scales[territoryCode as TerritoryCode]
      if (presetScale && currentScale !== presetScale) {
        return true
      }
    }

    for (const [territoryCode, currentParams] of Object.entries(territoryParameters)) {
      const presetParams = presetParameters.value[territoryCode as TerritoryCode]
      if (presetParams) {
        const allParamKeys = new Set([
          ...Object.keys(currentParams),
          ...Object.keys(presetParams),
        ])

        for (const paramKey of allParamKeys) {
          const currentValue = currentParams[paramKey]
          const presetValue = presetParams[paramKey as keyof ProjectionParameters]

          // Deep comparison for arrays and objects
          if (!areValuesEqual(currentValue, presetValue)) {
            return true
          }
        }
      }
      else {
        // Territory has parameters but no preset parameters - this is a divergence
        return true
      }
    }

    return false
  }

  return {
    territoryDefaults,
    presetParameters,
    presetGlobalParameters,
    storePresetDefaults,
    storeGlobalParameters,
    clearAll,
    getPresetDefaultsForTerritory,
    hasPresetDefaults,
    hasDivergingParameters,
  }
})
